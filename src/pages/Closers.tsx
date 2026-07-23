import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Phone, Users, CheckCircle, DollarSign, TrendingUp, TrendingDown, Plus, Columns3, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, startOfMonth, endOfMonth, isBefore, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Call = Database['public']['Tables']['client_closer_calls']['Row'];
type OwnerKey = 'torii' | 'adolfo' | 'raul';

interface CloserRow { id: string; name: string; }

// ─── Owner selector ─────────────────────────────────────────────────────────

const OWNERS: { key: OwnerKey; label: string; clientId: string | null }[] = [
  { key: 'torii',  label: 'Torii',          clientId: null },
  { key: 'adolfo', label: 'Adolfo Blasco',  clientId: 'c71488f4-0f94-4850-9a96-bc97fbaf5171' },
  { key: 'raul',   label: 'Raul Galindo',   clientId: 'fcc225d1-555a-4d9c-abb9-b823d48b6516' },
];

function matchesOwner(c: Call, owner: OwnerKey): boolean {
  if (owner === 'torii') return c.owner_type === 'torii';
  const o = OWNERS.find(x => x.key === owner)!;
  return c.client_id === o.clientId;
}

function revenueOf(c: Call): number {
  return (c.owner_type === 'torii' ? c.precio : c.comision_estimada) ?? 0;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LOSS_REASONS = [
  { value: 'precio_alto',       label: 'Precio alto' },
  { value: 'no_es_momento',     label: 'No es el momento' },
  { value: 'necesita_pensarlo', label: 'Necesita pensarlo' },
  { value: 'hablar_con_socio',  label: 'Hablar con socio/pareja' },
  { value: 'no_confia',         label: 'No confía' },
  { value: 'ya_tiene_solucion', label: 'Ya tiene solución' },
  { value: 'sin_capital',       label: 'Sin capital' },
  { value: 'otro',              label: 'Otro' },
];
const LOSS_REASON_LABEL: Record<string, string> = Object.fromEntries(LOSS_REASONS.map(r => [r.value, r.label]));

// Radix's SelectItem forbids value="" (it's reserved internally for "no
// selection" / placeholder) — using it crashes the Select on mount. Every
// "none" option below uses this sentinel instead, converted back to null
// on save.
const NONE = 'none';
// Sentinel for "closer" Selects — picking it switches to a free-text input
// instead of the fixed roster, for closers not yet in the `closers` table.
const OTHER = '__other__';

// Converts a form field back to null for saving — treats both '' and the
// NONE sentinel as "not set".
function orNull(v: string): string | null {
  return v && v !== NONE ? v : null;
}

const SEGUNDA_LLAMADA_OPTIONS = [
  { value: 'realizada',  label: 'Realizada' },
  { value: 'no_asistio', label: 'No asistió' },
  { value: 'reagendada', label: 'Reagendada' },
  { value: 'pendiente',  label: 'Pendiente' },
  { value: 'cancelada',  label: 'Cancelada' },
];

const SITUACIONES = [
  'No se presentó', 'No calificó', 'Seguimiento', 'Cerró', 'Reagendado', 'Sin información',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yy'); } catch { return '—'; }
}

function pct(num: number, den: number): string {
  return den ? `${Math.round((num / den) * 100)}%` : '—';
}

function rateColor(rate: number, good: number, ok: number): string {
  return rate >= good ? 'text-success' : rate >= ok ? 'text-warning' : 'text-destructive';
}

// Month/year navigation, same pattern as Finanzas.tsx — bounds are the
// calendar month itself, so a future month (e.g. an already-booked
// December) is a perfectly valid selection and includes those rows.
function monthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });
}

function monthBounds(year: number, month: number): { since: string; until: string } {
  const d = new Date(year, month - 1, 1);
  return {
    since: format(startOfMonth(d), 'yyyy-MM-dd'),
    until: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
}

function navMonth(year: number, month: number, dir: 'prev' | 'next'): { year: number; month: number } {
  if (dir === 'prev') return month === 1  ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return                     month === 12 ? { year: year + 1, month: 1  } : { year, month: month + 1 };
}

function inRange(dateStr: string | null, since: string | null, until: string | null): boolean {
  if (!since) return true;
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return !isBefore(d, parseISO(since)) && !isAfter(d, parseISO(until! + 'T23:59:59'));
  } catch { return false; }
}

function fuenteOf(c: Call): string {
  return c.fuente || c.utm_source || 'Sin fuente';
}

// closer is free text on the call row (CloserField lets someone type a
// custom name via "Otro"), compared against closers.name from a separate
// table — trim/casing/accent drift between the two silently returned 0
// rows before this normalized instead of erroring.
function normalizeCloserName(name: string): string {
  // NFD splits accented letters into base + combining-mark codepoints
  // (U+0300-U+036F); dropping chars in that range strips the accent while
  // leaving the base letter, e.g. "á" -> "a".
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((ch) => { const code = ch.charCodeAt(0); return code < 0x0300 || code > 0x036f; })
    .join('');
}

// ─── FunnelCard ───────────────────────────────────────────────────────────────

function FunnelCard({ total, asistieron, calificados, cerrados }: {
  total: number; asistieron: number; calificados: number; cerrados: number;
}) {
  const stages = [
    { label: 'Agendas',     value: total,       w: 100, color: 'bg-primary/20 border-primary/30',  text: 'text-primary' },
    { label: 'Asistieron',  value: asistieron,  w: total ? Math.max(20, (asistieron  / total) * 100) : 20, color: 'bg-info/20 border-info/30',      text: 'text-info' },
    { label: 'Calificados', value: calificados, w: total ? Math.max(12, (calificados / total) * 100) : 12, color: 'bg-warning/20 border-warning/30', text: 'text-warning' },
    { label: 'Cerrados',    value: cerrados,    w: total ? Math.max(6,  (cerrados    / total) * 100) : 6,  color: 'bg-success/20 border-success/30', text: 'text-success' },
  ];
  const rates = [pct(asistieron, total), pct(calificados, asistieron), pct(cerrados, calificados)];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Embudo de Conversión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <div
              className={cn('h-10 rounded border flex items-center justify-between px-3 shrink-0', s.color)}
              style={{ width: `${s.w}%` }}
            >
              <span className={cn('text-sm font-bold', s.text)}>{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            {i < rates.length && <span className="text-xs text-muted-foreground shrink-0">→ {rates[i]}</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── FollowUpsCard ────────────────────────────────────────────────────────────

function FollowUpsCard({ calls }: { calls: Call[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pending = [...calls]
    .filter(c => c.califico && !c.cerro)
    .sort((a, b) => {
      if (!a.next_followup_date && !b.next_followup_date) return 0;
      if (!a.next_followup_date) return 1;
      if (!b.next_followup_date) return -1;
      return a.next_followup_date.localeCompare(b.next_followup_date);
    });

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Follow-ups Pendientes</CardTitle>
          <Badge className="bg-warning/20 text-warning border-0 text-xs">{pending.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-y-auto">
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Sin follow-ups pendientes</p>
        )}
        {pending.map(c => {
          const due = c.next_followup_date ? parseISO(c.next_followup_date) : null;
          const overdue = due ? isBefore(due, today) : false;
          const isToday = due ? format(due, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') : false;
          return (
            <div key={c.id} className={cn('flex items-start justify-between rounded-md p-2.5 text-sm gap-2', overdue ? 'bg-destructive/10' : 'bg-secondary/50')}>
              <div className="min-w-0">
                <p className="font-medium truncate">{c.lead_name}</p>
                <p className="text-xs text-muted-foreground">{c.nicho ? `${c.nicho} · ` : ''}{c.closer ?? 'Sin asignar'}</p>
              </div>
              <div className="text-right shrink-0">
                {due ? (
                  <Badge className={cn('text-xs border-0', overdue ? 'bg-destructive/20 text-destructive' : isToday ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground')}>
                    {overdue ? 'Vencido' : isToday ? 'Hoy' : fmtDate(c.next_followup_date)}
                  </Badge>
                ) : <span className="text-xs text-muted-foreground">Sin fecha</span>}
                <p className="text-xs text-muted-foreground mt-0.5">{c.followup_count ?? 0} contactos</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── GroupPerformanceTable (shared by "por fuente" and "por closer") ─────────

interface GroupRow {
  key: string; total: number; asistieron: number; calificados: number; cerrados: number;
  revenue: number; cashUpfront: number;
}

function buildGroupRows(calls: Call[], keyOf: (c: Call) => string): GroupRow[] {
  const groups = new Map<string, Call[]>();
  for (const c of calls) {
    const k = keyOf(c);
    const arr = groups.get(k);
    if (arr) arr.push(c); else groups.set(k, [c]);
  }
  return Array.from(groups.entries()).map(([key, group]) => {
    const closed = group.filter(c => c.cerro);
    return {
      key,
      total: group.length,
      asistieron: group.filter(c => c.se_presento).length,
      calificados: group.filter(c => c.califico).length,
      cerrados: closed.length,
      revenue: closed.reduce((s, c) => s + revenueOf(c), 0),
      cashUpfront: closed.filter(c => c.pago_en_llamada).reduce((s, c) => s + revenueOf(c), 0),
    };
  }).sort((a, b) => b.total - a.total);
}

function GroupPerformanceTable({ title, labelHeader, rows, showUpfront }: {
  title: string; labelHeader: string; rows: GroupRow[]; showUpfront?: boolean;
}) {
  const colCount = showUpfront ? 11 : 9;
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labelHeader}</TableHead>
              <TableHead className="text-center">Agendas</TableHead>
              <TableHead className="text-center">Show%</TableHead>
              <TableHead className="text-center">Calificados</TableHead>
              <TableHead className="text-center">Qual%</TableHead>
              <TableHead className="text-center">Cierres</TableHead>
              <TableHead className="text-center">Close%</TableHead>
              <TableHead className="text-center">AOV Contrato</TableHead>
              <TableHead className="text-center">Cash</TableHead>
              {showUpfront && <TableHead className="text-center">Cash Upfront</TableHead>}
              {showUpfront && <TableHead className="text-center">% Upfront</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.key}>
                <TableCell className="font-medium text-sm">{r.key}</TableCell>
                <TableCell className="text-center text-sm">{r.total}</TableCell>
                <TableCell className="text-center text-xs">
                  <span className={rateColor(r.total ? Math.round(r.asistieron / r.total * 100) : 0, 70, 50)}>{pct(r.asistieron, r.total)}</span>
                </TableCell>
                <TableCell className="text-center text-sm">{r.calificados}</TableCell>
                <TableCell className="text-center text-xs">
                  <span className={rateColor(r.asistieron ? Math.round(r.calificados / r.asistieron * 100) : 0, 50, 30)}>{pct(r.calificados, r.asistieron)}</span>
                </TableCell>
                <TableCell className="text-center text-sm">{r.cerrados}</TableCell>
                <TableCell className="text-center text-xs">
                  <span className={rateColor(r.calificados ? Math.round(r.cerrados / r.calificados * 100) : 0, 25, 15)}>{pct(r.cerrados, r.calificados)}</span>
                </TableCell>
                <TableCell className="text-center text-sm">{r.cerrados ? `$${Math.round(r.revenue / r.cerrados).toLocaleString()}` : '—'}</TableCell>
                <TableCell className="text-center text-sm font-medium">{r.revenue ? `$${r.revenue.toLocaleString()}` : '—'}</TableCell>
                {showUpfront && (
                  <TableCell className="text-center text-sm">{r.cashUpfront ? `$${r.cashUpfront.toLocaleString()}` : '—'}</TableCell>
                )}
                {showUpfront && (
                  <TableCell className="text-center text-xs">{r.revenue ? `${Math.round(r.cashUpfront / r.revenue * 100)}%` : '—'}</TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={colCount} className="text-center py-6 text-muted-foreground">Sin datos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── PagoTiposTable ───────────────────────────────────────────────────────────

const PAGO_BUCKETS = [
  { key: '1',  label: 'Pago único',  test: (n: number) => n <= 1 },
  { key: '2',  label: '2 cuotas',    test: (n: number) => n === 2 },
  { key: '3',  label: '3 cuotas',    test: (n: number) => n === 3 },
  { key: '4+', label: '4+ cuotas',   test: (n: number) => n >= 4 },
] as const;

function PagoTiposTable({ calls }: { calls: Call[] }) {
  const closed = calls.filter(c => c.cerro);
  const totalClosed = closed.length;

  const rows = PAGO_BUCKETS.map(b => {
    const group = closed.filter(c => b.test(c.num_cuotas ?? 1));
    const revenue = group.reduce((s, c) => s + revenueOf(c), 0);
    return {
      key: b.key,
      label: b.label,
      count: group.length,
      pctOfTotal: totalClosed ? Math.round((group.length / totalClosed) * 100) : 0,
      revenue,
      aov: group.length ? Math.round(revenue / group.length) : 0,
      enLlamada: group.filter(c => c.pago_en_llamada).length,
      fueraDeLlamada: group.filter(c => !c.pago_en_llamada).length,
    };
  });

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Tipos de Pago</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-center">% del total</TableHead>
              <TableHead className="text-center">Ingresos</TableHead>
              <TableHead className="text-center">AOV</TableHead>
              <TableHead className="text-center">Pagó en llamada</TableHead>
              <TableHead className="text-center">Pagó fuera de llamada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.key}>
                <TableCell className="font-medium text-sm">{r.label}</TableCell>
                <TableCell className="text-center text-sm">{r.count || '—'}</TableCell>
                <TableCell className="text-center text-sm">{r.count ? `${r.pctOfTotal}%` : '—'}</TableCell>
                <TableCell className="text-center text-sm">{r.revenue ? `$${r.revenue.toLocaleString()}` : '—'}</TableCell>
                <TableCell className="text-center text-sm">{r.aov ? `$${r.aov.toLocaleString()}` : '—'}</TableCell>
                <TableCell className="text-center text-sm">{r.enLlamada || '—'}</TableCell>
                <TableCell className="text-center text-sm">{r.fueraDeLlamada || '—'}</TableCell>
              </TableRow>
            ))}
            {totalClosed === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Sin cierres en este período</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── TrendChart ───────────────────────────────────────────────────────────────

type TrendGranularity = 'week' | 'month';

interface TrendPoint { period: string; agendas: number; cierres: number; revenue: number; }

function buildTrendData(calls: Call[], granularity: TrendGranularity): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const c of calls) {
    if (!c.fecha_llamada) continue;
    let date: Date;
    try { date = parseISO(c.fecha_llamada); } catch { continue; }
    const bucketKey = granularity === 'month'
      ? format(date, 'yyyy-MM')
      : format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    let point = map.get(bucketKey);
    if (!point) { point = { period: bucketKey, agendas: 0, cierres: 0, revenue: 0 }; map.set(bucketKey, point); }
    point.agendas++;
    if (c.cerro) { point.cierres++; point.revenue += revenueOf(c); }
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function TrendChart({ calls }: { calls: Call[] }) {
  const [granularity, setGranularity] = useState<TrendGranularity>('week');
  const data = useMemo(() => buildTrendData(calls, granularity), [calls, granularity]);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">Tendencia</CardTitle>
        <Select value={granularity} onValueChange={v => setGranularity(v as TrendGranularity)}>
          <SelectTrigger className="w-28 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensual</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <ChartTooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="agendas" stroke="hsl(var(--info))" strokeWidth={2} dot={false} name="Agendas" />
              <Line yAxisId="left" type="monotone" dataKey="cierres" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Cierres" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Revenue" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── LossReasonsCard ──────────────────────────────────────────────────────────

function LossReasonsCard({ calls }: { calls: Call[] }) {
  const reasons = calls.filter(c => !c.cerro && c.loss_reason);
  const counts = new Map<string, number>();
  for (const c of reasons) {
    const key = c.loss_reason!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Motivos de No Cierre</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>}
        {rows.map(([reason, count]) => (
          <div key={reason} className="flex items-center justify-between text-sm bg-secondary/30 rounded-md px-3 py-2">
            <span>{LOSS_REASON_LABEL[reason] ?? reason}</span>
            <Badge className="bg-secondary text-foreground border-0">{count}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── NewCallDialog ────────────────────────────────────────────────────────────

type NewForm = {
  lead_name: string; lead_email: string; lead_phone: string;
  fecha_llamada: string; hora_llamada: string;
  fuente: string; setter_agendo: string; nicho: string; closer: string; ad_id: string;
};
const EMPTY_NEW: NewForm = {
  lead_name: '', lead_email: '', lead_phone: '',
  fecha_llamada: '', hora_llamada: '',
  fuente: '', setter_agendo: '', nicho: '', closer: NONE, ad_id: '',
};

// Business default: Torii's own calls (owner_type='torii') default to
// Lucho, not "Sin asignar" — client-owned calls still start blank since
// there's no single default closer across all clients.
const TORII_DEFAULT_CLOSER = 'Lucho';

// ─── Shared form field wrappers ───────────────────────────────────────────────
// Defined at module scope (not inside the dialogs) on purpose: a component
// declared inline in a parent's render body is a NEW function reference on
// every render, so React treats <F> as a different component type each time
// and unmounts/remounts its subtree — every keystroke that updates form
// state would blow away and recreate the <Input> underneath it, losing
// focus after each character. Hoisting them here gives them a stable
// identity across renders.

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CheckField({ label, checked, onCheckedChange, id }: {
  label: string; checked: boolean; onCheckedChange: (v: boolean) => void; id: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={v => onCheckedChange(!!v)} id={id} />
      <Label htmlFor={id} className="text-sm cursor-pointer">{label}</Label>
    </div>
  );
}

// ─── CloserField ──────────────────────────────────────────────────────────────
// Select from the closers roster, with an "Otro" option that switches to a
// free-text input for a closer not yet in the `closers` table.

function CloserField({ value, onChange, closers }: { value: string; onChange: (v: string) => void; closers: CloserRow[] }) {
  const isKnown = value === NONE || closers.some(c => c.name === value);
  const [customMode, setCustomMode] = useState(!isKnown);

  if (customMode) {
    return (
      <div className="flex gap-2">
        <Input
          value={value === NONE ? '' : value}
          onChange={e => onChange(e.target.value)}
          className="bg-secondary/50 h-8 text-sm"
          placeholder="Nombre del closer"
        />
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs shrink-0" onClick={() => { setCustomMode(false); onChange(NONE); }}>
          Lista
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={v => {
        if (v === OTHER) { setCustomMode(true); onChange(''); }
        else onChange(v);
      }}
    >
      <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sin asignar</SelectItem>
        {closers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
        <SelectItem value={OTHER}>Otro (escribir nombre)…</SelectItem>
      </SelectContent>
    </Select>
  );
}

function NewCallDialog({ closers, owner, onClose, onSaved }: {
  closers: CloserRow[]; owner: OwnerKey; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<NewForm>(() => ({
    ...EMPTY_NEW,
    closer: owner === 'torii' && closers.some(c => c.name === TORII_DEFAULT_CLOSER) ? TORII_DEFAULT_CLOSER : NONE,
  }));
  const [saving, setSaving] = useState(false);

  function upd(k: keyof NewForm, v: string) { setF(p => ({ ...p, [k]: v })); }

  async function save() {
    if (!f.lead_name.trim()) { toast.error('El nombre del lead es requerido'); return; }
    setSaving(true);
    const ownerDef = OWNERS.find(o => o.key === owner)!;
    const { error } = await supabase.from('client_closer_calls').insert({
      lead_name:      f.lead_name.trim(),
      lead_email:     f.lead_email     || null,
      lead_phone:     f.lead_phone     || null,
      fecha_llamada:  f.fecha_llamada  || null,
      hora_llamada:   f.hora_llamada   || null,
      fuente:         f.fuente         || null,
      setter_agendo:  f.setter_agendo  || null,
      nicho:          f.nicho          || null,
      closer:         f.closer === NONE ? null : f.closer || null,
      ad_id:          f.ad_id          || null,
      owner_type:     owner === 'torii' ? 'torii' : 'client',
      client_id:      ownerDef.clientId,
      se_presento:    false,
      califico:       false,
      cerro:          false,
      pago_en_llamada: false,
      followup_count: 0,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear la agenda'); return; }
    toast.success('Agenda creada');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle>Nueva Agenda</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <F label="Nombre del lead *">
              <Input
                value={f.lead_name}
                onChange={e => upd('lead_name', e.target.value)}
                className="bg-secondary/50"
                placeholder="Nombre completo"
                onKeyDown={e => e.key === 'Enter' && save()}
              />
            </F>
          </div>
          <F label="Email">
            <Input type="email" value={f.lead_email} onChange={e => upd('lead_email', e.target.value)} className="bg-secondary/50" />
          </F>
          <F label="Teléfono">
            <Input value={f.lead_phone} onChange={e => upd('lead_phone', e.target.value)} className="bg-secondary/50" />
          </F>
          <F label="Fecha llamada">
            <Input type="date" value={f.fecha_llamada} onChange={e => upd('fecha_llamada', e.target.value)} className="bg-secondary/50 h-9" />
          </F>
          <F label="Hora">
            <Input value={f.hora_llamada} onChange={e => upd('hora_llamada', e.target.value)} className="bg-secondary/50" placeholder="ej. 14:30" />
          </F>
          <F label="Fuente">
            <Input value={f.fuente} onChange={e => upd('fuente', e.target.value)} className="bg-secondary/50" placeholder="ej. IG, FB, Referido" />
          </F>
          <F label="Setter que agendó">
            <Input value={f.setter_agendo} onChange={e => upd('setter_agendo', e.target.value)} className="bg-secondary/50" placeholder="Nombre del setter" />
          </F>
          <F label="Nicho">
            <Input value={f.nicho} onChange={e => upd('nicho', e.target.value)} className="bg-secondary/50" placeholder="ej. Asesor financiero" />
          </F>
          <F label="Closer">
            <CloserField value={f.closer} onChange={v => upd('closer', v)} closers={closers} />
          </F>
          <F label="Ad ID">
            <Input value={f.ad_id} onChange={e => upd('ad_id', e.target.value)} className="bg-secondary/50" placeholder="ID del anuncio" />
          </F>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !f.lead_name.trim()} className="bg-primary">
            {saving ? 'Guardando…' : 'Crear agenda'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

type DForm = {
  fecha_llamada: string;
  hora_llamada: string; fuente: string; ad_id: string; utm_campaign: string; utm_source: string;
  setter_agendo: string; closer: string; nicho: string;
  se_presento: boolean; situacion_resultado: string; segunda_llamada_fecha: string; segunda_llamada_status: string;
  oferta_hecha: boolean; segunda_llamada_se_presento: boolean; reagenda_texto: string; situacion_3ra_llamada: string;
  califico: boolean; cerro: boolean; producto: string; precio: string; comision_estimada: string;
  num_cuotas: string; pago_en_llamada: boolean; loss_reason: string;
  situacion_laboral: string; nivel_ingresos: string; capacidad_ahorro: string;
  preocupacion_actual: string; edad: string; hijos_casado: string;
  next_followup_date: string; followup_notes: string; objections: string; notes: string;
  seguimiento_requerido: boolean; estado_seguimiento: string;
};

function toForm(c: Call): DForm {
  return {
    fecha_llamada:          c.fecha_llamada ? c.fecha_llamada.slice(0, 10) : '',
    hora_llamada:           c.hora_llamada ?? '',
    fuente:                 c.fuente ?? '',
    ad_id:                  c.ad_id ?? '',
    utm_campaign:           c.utm_campaign ?? '',
    utm_source:             c.utm_source ?? '',
    setter_agendo:          c.setter_agendo ?? '',
    closer:                 c.closer ?? NONE,
    nicho:                  c.nicho ?? '',
    se_presento:            c.se_presento ?? false,
    situacion_resultado:    c.situacion_resultado ?? NONE,
    segunda_llamada_fecha:  c.segunda_llamada_fecha ? c.segunda_llamada_fecha.slice(0, 10) : '',
    segunda_llamada_status: c.segunda_llamada_status ?? NONE,
    oferta_hecha:                c.oferta_hecha ?? false,
    segunda_llamada_se_presento: c.segunda_llamada_se_presento ?? false,
    reagenda_texto:               c.reagenda_texto ?? '',
    situacion_3ra_llamada:        c.situacion_3ra_llamada ?? '',
    califico:               c.califico ?? false,
    cerro:                  c.cerro ?? false,
    producto:               c.producto ?? '',
    precio:                 c.precio?.toString() ?? '',
    comision_estimada:      c.comision_estimada?.toString() ?? '',
    num_cuotas:             c.num_cuotas?.toString() ?? '',
    pago_en_llamada:        c.pago_en_llamada ?? false,
    loss_reason:            c.loss_reason ?? NONE,
    situacion_laboral:      c.situacion_laboral ?? '',
    nivel_ingresos:         c.nivel_ingresos ?? '',
    capacidad_ahorro:       c.capacidad_ahorro ?? '',
    preocupacion_actual:    c.preocupacion_actual ?? '',
    edad:                   c.edad?.toString() ?? '',
    hijos_casado:           c.hijos_casado ?? '',
    next_followup_date:     c.next_followup_date ? c.next_followup_date.slice(0, 10) : '',
    followup_notes:         c.followup_notes ?? '',
    objections:             c.objections ?? '',
    notes:                  c.notes ?? '',
    seguimiento_requerido:  c.seguimiento_requerido ?? false,
    estado_seguimiento:     c.estado_seguimiento ?? '',
  };
}

function DetailDialog({ call, closers, owner, onClose, onSaved }: {
  call: Call; closers: CloserRow[]; owner: OwnerKey; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<DForm>(toForm(call));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Torii's own funnel (owner_type='torii') sells a fixed-price product
  // directly, so it has no client-commission or lead-qualification fields;
  // client-run calls (Adolfo/Raul/etc.) sell on Torii's behalf for a
  // commission and track a fuller lead profile. Same distinction as
  // matchesOwner()/revenueOf() above.
  const isTorii = owner === 'torii';

  function upd<K extends keyof DForm>(k: K, v: DForm[K]) {
    setF(prev => ({ ...prev, [k]: v }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('client_closer_calls').update({
      fecha_llamada:          f.fecha_llamada || null,
      hora_llamada:           f.hora_llamada || null,
      fuente:                 f.fuente || null,
      ad_id:                  f.ad_id || null,
      utm_campaign:           f.utm_campaign || null,
      utm_source:             f.utm_source || null,
      setter_agendo:          f.setter_agendo || null,
      closer:                 orNull(f.closer),
      nicho:                  f.nicho || null,
      se_presento:            f.se_presento,
      situacion_resultado:    orNull(f.situacion_resultado),
      segunda_llamada_fecha:  f.segunda_llamada_fecha || null,
      segunda_llamada_status: orNull(f.segunda_llamada_status),
      oferta_hecha:                f.oferta_hecha,
      segunda_llamada_se_presento: f.segunda_llamada_se_presento,
      reagenda_texto:               f.reagenda_texto || null,
      situacion_3ra_llamada:        f.situacion_3ra_llamada || null,
      califico:               f.califico,
      cerro:                  f.cerro,
      producto:               f.producto || null,
      precio:                 f.precio ? parseFloat(f.precio) : null,
      comision_estimada:      f.comision_estimada ? parseFloat(f.comision_estimada) : null,
      num_cuotas:             f.num_cuotas ? parseInt(f.num_cuotas) : null,
      pago_en_llamada:        f.pago_en_llamada,
      loss_reason:            orNull(f.loss_reason),
      situacion_laboral:      f.situacion_laboral || null,
      nivel_ingresos:         f.nivel_ingresos || null,
      capacidad_ahorro:       f.capacidad_ahorro || null,
      preocupacion_actual:    f.preocupacion_actual || null,
      edad:                   f.edad ? parseInt(f.edad) : null,
      hijos_casado:           f.hijos_casado || null,
      next_followup_date:     f.next_followup_date || null,
      followup_notes:         f.followup_notes || null,
      objections:             f.objections || null,
      notes:                  f.notes || null,
      seguimiento_requerido:  f.seguimiento_requerido,
      estado_seguimiento:     f.estado_seguimiento || null,
    }).eq('id', call.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Guardado');
    setDirty(false);
    onSaved();
  }

  async function markClosed() {
    setSaving(true);
    const { error } = await supabase.from('client_closer_calls').update({ cerro: true }).eq('id', call.id);
    setSaving(false);
    if (error) { toast.error('Error'); return; }
    toast.success('Marcado como cerrado');
    onSaved(); onClose();
  }

  async function handleDelete() {
    if (!window.confirm('¿Estás seguro que querés eliminar esta agenda? Esta acción no se puede deshacer.')) return;
    setSaving(true);
    const { error } = await supabase.from('client_closer_calls').delete().eq('id', call.id);
    setSaving(false);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Agenda eliminada');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{call.lead_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {[call.lead_email, call.lead_phone].filter(Boolean).join(' · ')}
          </p>
        </DialogHeader>

        {/* ── Logística ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Logística</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Fecha llamada">
              <Input type="date" value={f.fecha_llamada} onChange={e => upd('fecha_llamada', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
            <F label="Hora">
              <Input value={f.hora_llamada} onChange={e => upd('hora_llamada', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="ej. 14:30" />
            </F>
            {isTorii && (
              <F label="Fuente">
                <Input value={f.fuente} onChange={e => upd('fuente', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="ej. IG, FB, Referido" />
              </F>
            )}
            {!isTorii && (
              <F label="Ad ID">
                <Input value={f.ad_id} onChange={e => upd('ad_id', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
              </F>
            )}
            <F label="UTM Campaign">
              <Input value={f.utm_campaign} onChange={e => upd('utm_campaign', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
            <F label="UTM Source">
              <Input value={f.utm_source} onChange={e => upd('utm_source', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
            {isTorii && (
              <F label="Setter que agendó">
                <Input value={f.setter_agendo} onChange={e => upd('setter_agendo', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
              </F>
            )}
            <F label="Closer">
              <CloserField value={f.closer} onChange={v => upd('closer', v)} closers={closers} />
            </F>
            <F label="Nicho">
              <Input value={f.nicho} onChange={e => upd('nicho', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
          </div>
        </div>

        <Separator />

        {/* ── Llamada ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Llamada</p>
          <div className="flex flex-wrap gap-6 mb-3">
            <CheckField id="dlg-se_presento" label="Se presentó" checked={f.se_presento} onCheckedChange={v => upd('se_presento', v)} />
            <CheckField id="dlg-oferta_hecha" label="Oferta hecha" checked={f.oferta_hecha} onCheckedChange={v => upd('oferta_hecha', v)} />
            <CheckField id="dlg-segunda_se_presento" label="Se presentó a 2da llamada" checked={f.segunda_llamada_se_presento} onCheckedChange={v => upd('segunda_llamada_se_presento', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Situación / Resultado">
              <Select value={f.situacion_resultado} onValueChange={v => upd('situacion_resultado', v)}>
                <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {SITUACIONES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            {isTorii && (
              <F label="Fecha 2da llamada">
                <Input type="date" value={f.segunda_llamada_fecha} onChange={e => upd('segunda_llamada_fecha', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
              </F>
            )}
            {isTorii && (
              <F label="Estado 2da llamada">
                <Select value={f.segunda_llamada_status} onValueChange={v => upd('segunda_llamada_status', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {SEGUNDA_LLAMADA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            )}
            <F label="Reagenda (texto libre)">
              <Input value={f.reagenda_texto} onChange={e => upd('reagenda_texto', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="ej. Lunes 12 a las 15hs" />
            </F>
            <F label="Situación 3ra llamada">
              <Input value={f.situacion_3ra_llamada} onChange={e => upd('situacion_3ra_llamada', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
          </div>
        </div>

        <Separator />

        {/* ── Resultado ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resultado</p>
          <div className="flex flex-wrap gap-6 mb-3">
            <CheckField id="dlg-califico" label="Calificado" checked={f.califico} onCheckedChange={v => upd('califico', v)} />
            <CheckField id="dlg-cerro" label="Cerrado" checked={f.cerro} onCheckedChange={v => upd('cerro', v)} />
            {isTorii && (
              <CheckField id="dlg-pago_en_llamada" label="Pagó en llamada" checked={f.pago_en_llamada} onCheckedChange={v => upd('pago_en_llamada', v)} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!isTorii && (
              <F label="Producto">
                <Input value={f.producto} onChange={e => upd('producto', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
              </F>
            )}
            <F label="Número de cuotas">
              <Input type="number" min={1} value={f.num_cuotas} onChange={e => upd('num_cuotas', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
            <F label="Precio (Torii, USD)">
              <Input type="number" value={f.precio} onChange={e => upd('precio', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="3000" />
            </F>
            {!isTorii && (
              <F label="Comisión estimada (clientes, USD)">
                <Input type="number" value={f.comision_estimada} onChange={e => upd('comision_estimada', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
              </F>
            )}
          </div>
          {f.califico && !f.cerro && (
            <div className="mt-3">
              <F label="Motivo de no cierre">
                <Select value={f.loss_reason} onValueChange={v => upd('loss_reason', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Seleccioná un motivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin especificar</SelectItem>
                    {LOSS_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </div>
          )}
        </div>

        {!isTorii && (
          <>
            <Separator />

            {/* ── Perfil del Lead ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Perfil del Lead</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Situación laboral">
                  <Input value={f.situacion_laboral} onChange={e => upd('situacion_laboral', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                </F>
                <F label="Nivel de ingresos">
                  <Input value={f.nivel_ingresos} onChange={e => upd('nivel_ingresos', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                </F>
                <F label="Capacidad de ahorro">
                  <Input value={f.capacidad_ahorro} onChange={e => upd('capacidad_ahorro', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                </F>
                <F label="Edad">
                  <Input type="number" value={f.edad} onChange={e => upd('edad', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                </F>
                <F label="Hijos / Estado civil">
                  <Input value={f.hijos_casado} onChange={e => upd('hijos_casado', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                </F>
                <div className="col-span-2">
                  <F label="Preocupación actual">
                    <Textarea rows={2} value={f.preocupacion_actual} onChange={e => upd('preocupacion_actual', e.target.value)} className="bg-secondary/50 text-sm resize-none" />
                  </F>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* ── Seguimiento ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Seguimiento</p>
          <div className="flex flex-wrap items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!f.next_followup_date}
                onCheckedChange={v => upd('next_followup_date', v ? (f.next_followup_date || format(new Date(), 'yyyy-MM-dd')) : '')}
                id="dlg-seguimiento"
              />
              <Label htmlFor="dlg-seguimiento" className="text-sm cursor-pointer">Seguimiento realizado</Label>
            </div>
            <CheckField id="dlg-seguimiento_requerido" label="Seguimiento requerido" checked={f.seguimiento_requerido} onCheckedChange={v => upd('seguimiento_requerido', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {f.next_followup_date && (
              <F label="Próxima fecha de follow-up">
                <Input type="date" value={f.next_followup_date} onChange={e => upd('next_followup_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
              </F>
            )}
            <F label="Estado de seguimiento">
              <Input value={f.estado_seguimiento} onChange={e => upd('estado_seguimiento', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
            <F label="Contactos de seguimiento">
              <p className="text-sm bg-secondary/30 rounded px-2 py-1.5">{call.followup_count ?? 0}</p>
            </F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Notas de follow-up">
              <Textarea rows={2} value={f.followup_notes} onChange={e => upd('followup_notes', e.target.value)} className="bg-secondary/50 text-sm resize-none" />
            </F>
            <F label="Objeciones">
              <Textarea rows={2} value={f.objections} onChange={e => upd('objections', e.target.value)} className="bg-secondary/50 text-sm resize-none" />
            </F>
            <div className="col-span-2">
              <F label="Notas generales">
                <Textarea rows={2} value={f.notes} onChange={e => upd('notes', e.target.value)} className="bg-secondary/50 text-sm resize-none" />
              </F>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={saving} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-1" />Eliminar
            </Button>
            {f.califico && !f.cerro && (
              <Button variant="outline" size="sm" onClick={markClosed} disabled={saving} className="text-success border-success/40 hover:bg-success/10">
                <CheckCircle className="h-4 w-4 mr-1" />Marcar como cerrado
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving} className="bg-primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── CRM table columns (Torii vs. client owners see different fields) ───────

interface ColumnDef {
  header: string;
  cell: (c: Call) => React.ReactNode;
}

const YES_NO_BADGE = (v: boolean | null) =>
  v === true  ? <Badge className="text-xs border-0 bg-success/20 text-success">Sí</Badge>
: v === false ? <Badge className="text-xs border-0 bg-secondary text-muted-foreground">No</Badge>
: <span className="text-muted-foreground text-xs">—</span>;

const CRM_COLUMNS: Record<string, ColumnDef> = {
  lead_name: {
    header: 'Lead',
    cell: c => <span className="font-medium whitespace-nowrap">{c.lead_name}</span>,
  },
  fecha_llamada: {
    header: 'Fecha',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{fmtDate(c.fecha_llamada)}</span>,
  },
  hora_llamada: {
    header: 'Hora',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.hora_llamada ?? '—'}</span>,
  },
  fuente: {
    header: 'Fuente',
    cell: c => c.fuente || c.utm_source
      ? <Badge className="text-xs border-0 bg-secondary text-foreground">{fuenteOf(c)}</Badge>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  ad_id: {
    header: 'Ad ID',
    cell: c => <span className="text-xs text-muted-foreground max-w-[100px] block truncate" title={c.ad_id ?? undefined}>{c.ad_id ?? '—'}</span>,
  },
  setter_agendo: {
    header: 'Setter agendó',
    cell: c => <span className="text-sm text-muted-foreground">{c.setter_agendo ?? '—'}</span>,
  },
  nicho: {
    header: 'Nicho',
    cell: c => (
      <span title={c.nicho ?? undefined} className="text-sm block max-w-[110px] truncate">
        {c.nicho ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  closer: {
    header: 'Closer',
    cell: c => <span className="text-sm">{c.closer ?? <span className="text-muted-foreground">—</span>}</span>,
  },
  se_presento: {
    header: 'Se presentó',
    cell: c => YES_NO_BADGE(c.se_presento),
  },
  califico: {
    header: 'Calificó',
    cell: c => YES_NO_BADGE(c.califico),
  },
  situacion_resultado: {
    header: 'Situación',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.situacion_resultado ?? '—'}</span>,
  },
  oferta_hecha: {
    header: 'Oferta hecha',
    cell: c => YES_NO_BADGE(c.oferta_hecha),
  },
  segunda_llamada_se_presento: {
    header: 'Se presentó 2da',
    cell: c => YES_NO_BADGE(c.segunda_llamada_se_presento),
  },
  reagenda_texto: {
    header: 'Reagenda',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.reagenda_texto ?? '—'}</span>,
  },
  situacion_3ra_llamada: {
    header: 'Situación 3ra',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.situacion_3ra_llamada ?? '—'}</span>,
  },
  seguimiento_requerido: {
    header: 'Seg. requerido',
    cell: c => YES_NO_BADGE(c.seguimiento_requerido),
  },
  estado_seguimiento: {
    header: 'Estado seg.',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.estado_seguimiento ?? '—'}</span>,
  },
  cerro: {
    header: 'Cerró',
    cell: c => c.cerro
      ? <Badge className="text-xs border-0 bg-success/20 text-success">Sí</Badge>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  producto: {
    header: 'Producto',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.producto ?? '—'}</span>,
  },
  precio: {
    header: 'Precio',
    cell: c => (
      <span className="text-sm whitespace-nowrap">
        {c.precio ? `$${c.precio.toLocaleString()}${c.num_cuotas && c.num_cuotas > 1 ? ` ×${c.num_cuotas}` : ''}` : '—'}
      </span>
    ),
  },
  num_cuotas: {
    header: 'Cuotas',
    cell: c => <span className="text-sm text-muted-foreground">{c.num_cuotas ?? '—'}</span>,
  },
  pago_en_llamada: {
    header: 'Pagó en llamada',
    cell: c => YES_NO_BADGE(c.pago_en_llamada),
  },
  comision_estimada: {
    header: 'Comisión',
    cell: c => <span className="text-sm whitespace-nowrap">{c.comision_estimada ? `$${c.comision_estimada.toLocaleString()}` : '—'}</span>,
  },
  loss_reason: {
    header: 'Motivo no cierre',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.loss_reason ? (LOSS_REASON_LABEL[c.loss_reason] ?? c.loss_reason) : '—'}</span>,
  },
  next_followup_date: {
    header: 'Próx. follow-up',
    cell: c => c.next_followup_date
      ? <span className="text-xs text-warning">{fmtDate(c.next_followup_date)}</span>
      : <span className="text-muted-foreground text-xs">—</span>,
  },
  situacion_laboral: {
    header: 'Sit. laboral',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.situacion_laboral ?? '—'}</span>,
  },
  nivel_ingresos: {
    header: 'Nivel ingresos',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.nivel_ingresos ?? '—'}</span>,
  },
  capacidad_ahorro: {
    header: 'Cap. ahorro',
    cell: c => <span className="text-sm text-muted-foreground whitespace-nowrap">{c.capacidad_ahorro ?? '—'}</span>,
  },
  edad: {
    header: 'Edad',
    cell: c => <span className="text-sm text-muted-foreground">{c.edad ?? '—'}</span>,
  },
};

const TORII_COLUMN_KEYS = [
  'lead_name', 'fecha_llamada', 'hora_llamada', 'fuente', 'setter_agendo', 'nicho', 'closer',
  'se_presento', 'califico', 'situacion_resultado', 'oferta_hecha', 'segunda_llamada_se_presento',
  'reagenda_texto', 'situacion_3ra_llamada', 'cerro', 'precio', 'num_cuotas',
  'pago_en_llamada', 'loss_reason', 'next_followup_date', 'seguimiento_requerido', 'estado_seguimiento',
];

const CLIENT_COLUMN_KEYS = [
  'lead_name', 'fecha_llamada', 'hora_llamada', 'ad_id', 'nicho', 'closer',
  'se_presento', 'califico', 'situacion_resultado', 'oferta_hecha', 'segunda_llamada_se_presento',
  'reagenda_texto', 'situacion_3ra_llamada', 'cerro', 'producto', 'precio',
  'comision_estimada', 'loss_reason', 'next_followup_date', 'seguimiento_requerido', 'estado_seguimiento',
  'situacion_laboral', 'nivel_ingresos', 'capacidad_ahorro', 'edad',
];

// lead_name can't be hidden; the rest default to hidden unless listed here.
// One shared set covers both owner modes — a key that doesn't apply to the
// current owner (e.g. "producto" while viewing Torii) is simply absent from
// that mode's column list, so it has no effect either way.
const ALWAYS_VISIBLE_KEYS = new Set(['lead_name']);
const DEFAULT_VISIBLE_KEYS = new Set([
  'lead_name', 'fecha_llamada', 'closer', 'se_presento', 'califico', 'cerro',
  'precio', 'comision_estimada', 'producto', 'next_followup_date',
  // Added to bring the default closer to the old Google Sheets' column set.
  'fuente', 'setter_agendo', 'num_cuotas', 'pago_en_llamada', 'loss_reason',
]);

// Column visibility is remembered per owner mode — Torii and client rows
// show different columns, so "adolfo" and "raul" share one "client" slot
// (their column sets are identical) while Torii gets its own.
function columnsStorageKey(owner: OwnerKey): string {
  return owner === 'torii' ? 'closing_visible_columns_torii' : 'closing_visible_columns_client';
}

function loadVisibleColumns(owner: OwnerKey): Set<string> {
  try {
    const raw = localStorage.getItem(columnsStorageKey(owner));
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // corrupt or inaccessible storage — fall through to defaults
  }
  return new Set(DEFAULT_VISIBLE_KEYS);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Closers() {
  const [calls, setCalls]     = useState<Call[]>([]);
  const [closers, setClosers] = useState<CloserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [owner, setOwner]   = useState<OwnerKey>('torii');
  const now = new Date();
  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [allTime, setAllTime] = useState(false);
  function navMonthClick(dir: 'prev' | 'next') {
    const { year: y, month: m } = navMonth(year, month, dir);
    setYear(y); setMonth(m);
  }

  const [filterCloser, setFilterCloser] = useState('all');
  const [filterFuente, setFilterFuente] = useState('all');
  const [filterNicho, setFilterNicho]   = useState('');
  const [filterCalifico, setFilterCalifico] = useState('all');
  const [filterCerro, setFilterCerro]   = useState('all');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => loadVisibleColumns('torii'));

  // Owner mode changed — swap in that mode's remembered column selection.
  useEffect(() => {
    setVisibleColumns(loadVisibleColumns(owner));
  }, [owner]);

  const [selected, setSelected] = useState<Call | null>(null);
  const [newOpen, setNewOpen]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, callRes] = await Promise.all([
      supabase.from('closers').select('id, name').order('name'),
      supabase.from('client_closer_calls').select('*').order('fecha_llamada', { ascending: false }),
    ]);
    if (cRes.data) setClosers(cRes.data);
    if (callRes.data) setCalls(callRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Owner + selected month (or all-time) → feeds the Dashboard tab and is
  // the base for the CRM tab's own filters. inRange() treats a null since
  // as "no bound", so allTime just skips the month restriction entirely.
  const { since, until }: { since: string | null; until: string | null } =
    allTime ? { since: null, until: null } : monthBounds(year, month);
  const viewCalls = useMemo(
    () => calls.filter(c => matchesOwner(c, owner) && inRange(c.fecha_llamada, since, until)),
    [calls, owner, since, until],
  );

  // KPIs
  const total          = viewCalls.length;
  const asistieron     = viewCalls.filter(c => c.se_presento).length;
  const noShow         = total - asistieron;
  const calificados    = viewCalls.filter(c => c.califico).length;
  const closedCalls    = viewCalls.filter(c => c.cerro);
  const cerrados       = closedCalls.length;
  const revenue        = closedCalls.reduce((s, c) => s + revenueOf(c), 0);
  const aov            = cerrados ? Math.round(revenue / cerrados) : 0;
  const upfrontCalls   = closedCalls.filter(c => c.pago_en_llamada);
  const cashUpfront    = upfrontCalls.reduce((s, c) => s + revenueOf(c), 0);
  const aovUpfront      = upfrontCalls.length ? Math.round(cashUpfront / upfrontCalls.length) : 0;
  const showRate       = total       ? Math.round((asistieron  / total)       * 100) : 0;
  const noShowRate     = total       ? Math.round((noShow      / total)       * 100) : 0;
  const qualRate       = asistieron  ? Math.round((calificados / asistieron)  * 100) : 0;
  const closeRate      = calificados ? Math.round((cerrados    / calificados) * 100) : 0;

  // Each card shows the absolute count as the big number; `sub` (when
  // present) is the rate relative to the previous funnel stage, shown
  // smaller underneath — both numbers are always visible, same as the
  // Google Sheets tracker this replaces.
  const kpis: { label: string; value: string | number; sub: string | null; icon: typeof Phone; cls: string }[] = [
    { label: 'Agendas',                                     value: total,                                          sub: null,             icon: Phone,        cls: '' },
    { label: 'Show Rate (Asistieron / Agendas)',            value: asistieron,                                     sub: `${showRate}%`,   icon: Users,        cls: rateColor(showRate, 70, 50) },
    { label: 'Calificados (Califican / Agendas)',           value: calificados,                                    sub: `${qualRate}%`,   icon: CheckCircle,  cls: rateColor(qualRate, 50, 30) },
    { label: 'Tasa Cierre (Cerrados / Calificados)',        value: cerrados,                                       sub: `${closeRate}%`,  icon: TrendingUp,   cls: rateColor(closeRate, 25, 15) },
    { label: 'No-Show (No asistieron / Agendas)',           value: noShow,                                         sub: `${noShowRate}%`, icon: TrendingDown, cls: noShowRate <= 30 ? 'text-success' : noShowRate <= 50 ? 'text-warning' : 'text-destructive' },
    { label: 'Revenue Total',                               value: `$${revenue.toLocaleString()}`,                 sub: null,             icon: DollarSign,   cls: revenue > 0 ? 'text-success' : '' },
    { label: 'AOV Contrato Cerrado',                        value: aov ? `$${aov.toLocaleString()}` : '—',         sub: null,             icon: DollarSign,   cls: '' },
    { label: 'Cash Collected Upfront',                      value: `$${cashUpfront.toLocaleString()}`,             sub: null,             icon: DollarSign,   cls: cashUpfront > 0 ? 'text-success' : '' },
    { label: 'AOV Cash Upfront',                            value: aovUpfront ? `$${aovUpfront.toLocaleString()}` : '—', sub: null,        icon: DollarSign,   cls: '' },
  ];

  const fuenteRows  = useMemo(() => buildGroupRows(viewCalls, fuenteOf), [viewCalls]);
  const closerRows  = useMemo(() => buildGroupRows(viewCalls, c => c.closer || 'Sin asignar'), [viewCalls]);

  const fuenteOptions = useMemo(() => Array.from(new Set(viewCalls.map(fuenteOf))).sort(), [viewCalls]);

  // CRM tab filters (on top of viewCalls)
  const nichoLC = filterNicho.toLowerCase();
  const tableCalls = viewCalls.filter(c => {
    if (filterCloser !== 'all' && normalizeCloserName(c.closer ?? '') !== normalizeCloserName(filterCloser)) return false;
    if (filterFuente !== 'all' && fuenteOf(c) !== filterFuente) return false;
    if (nichoLC && !(c.nicho ?? '').toLowerCase().includes(nichoLC)) return false;
    if (filterCalifico === 'yes' && !c.califico) return false;
    if (filterCalifico === 'no'  && c.califico)  return false;
    if (filterCerro === 'yes' && !c.cerro) return false;
    if (filterCerro === 'no'  && c.cerro)  return false;
    return true;
  });

  const activeColumnKeys = owner === 'torii' ? TORII_COLUMN_KEYS : CLIENT_COLUMN_KEYS;
  const activeColumns = activeColumnKeys
    .filter(k => ALWAYS_VISIBLE_KEYS.has(k) || visibleColumns.has(k))
    .map(k => ({ key: k, ...CRM_COLUMNS[k] }));

  function toggleColumn(key: string) {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(columnsStorageKey(owner), JSON.stringify(Array.from(next)));
      return next;
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Closing</h1>
          <p className="text-sm text-muted-foreground">
            {total} llamadas · {cerrados} cierres · ${revenue.toLocaleString()} revenue
          </p>
        </div>
        <Select value={owner} onValueChange={v => setOwner(v as OwnerKey)}>
          <SelectTrigger className="w-44 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OWNERS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMonthClick('prev')} disabled={allTime}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 min-w-[140px] text-center capitalize">
            {allTime ? 'Todo el historial' : monthLabel(year, month)}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMonthClick('next')} disabled={allTime}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 px-3 text-sm', allTime && 'bg-primary text-primary-foreground hover:bg-primary/90')}
            onClick={() => setAllTime(v => !v)}
          >
            Todo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Dashboard ── */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
            {kpis.map(k => {
              const Icon = k.icon;
              return (
                <Card key={k.label} className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className={cn('text-xl font-bold', k.cls)}>{k.value}</p>
                    {k.sub && <p className={cn('text-xs mt-0.5', k.cls || 'text-muted-foreground')}>{k.sub}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <FunnelCard total={total} asistieron={asistieron} calificados={calificados} cerrados={cerrados} />
            </div>
            <div className="col-span-2">
              <FollowUpsCard calls={viewCalls} />
            </div>
          </div>

          <TrendChart calls={viewCalls} />
          <GroupPerformanceTable title="Rendimiento por Fuente" labelHeader="Fuente" rows={fuenteRows} />
          <GroupPerformanceTable title="Performance por Closer" labelHeader="Closer" rows={closerRows} showUpfront />
          <PagoTiposTable calls={viewCalls} />
          <LossReasonsCard calls={viewCalls} />
        </TabsContent>

        {/* ── TAB 2: CRM ── */}
        <TabsContent value="crm" className="space-y-4 mt-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Llamadas ({tableCalls.length})
                </CardTitle>
                <Button size="sm" onClick={() => setNewOpen(true)} className="bg-primary h-8 ml-auto">
                  <Plus className="h-4 w-4 mr-1" />Nueva agenda
                </Button>
                <Select value={filterCloser} onValueChange={setFilterCloser}>
                  <SelectTrigger className="w-36 h-8 bg-secondary/50 text-sm"><SelectValue placeholder="Closer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los closers</SelectItem>
                    {closers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterFuente} onValueChange={setFilterFuente}>
                  <SelectTrigger className="w-32 h-8 bg-secondary/50 text-sm"><SelectValue placeholder="Fuente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {fuenteOptions.map(fu => <SelectItem key={fu} value={fu}>{fu}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={filterNicho}
                  onChange={e => setFilterNicho(e.target.value)}
                  placeholder="Nicho…"
                  className="w-32 h-8 bg-secondary/50 text-sm"
                />
                <Select value={filterCalifico} onValueChange={setFilterCalifico}>
                  <SelectTrigger className="w-36 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Calificación: todos</SelectItem>
                    <SelectItem value="yes">Solo calificados</SelectItem>
                    <SelectItem value="no">No calificados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCerro} onValueChange={setFilterCerro}>
                  <SelectTrigger className="w-32 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cierre: todos</SelectItem>
                    <SelectItem value="yes">Cerrados</SelectItem>
                    <SelectItem value="no">No cerrados</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 bg-secondary/50">
                      <Columns3 className="h-4 w-4 mr-1" />Columnas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {activeColumnKeys.map(k => (
                      <DropdownMenuCheckboxItem
                        key={k}
                        checked={ALWAYS_VISIBLE_KEYS.has(k) || visibleColumns.has(k)}
                        onCheckedChange={() => toggleColumn(k)}
                        disabled={ALWAYS_VISIBLE_KEYS.has(k)}
                      >
                        {CRM_COLUMNS[k].header}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeColumns.map(col => <TableHead key={col.key}>{col.header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableCalls.map(call => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => setSelected(call)}
                    >
                      {activeColumns.map(col => <TableCell key={col.key}>{col.cell(call)}</TableCell>)}
                    </TableRow>
                  ))}
                  {tableCalls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={activeColumns.length} className="text-center py-8 text-muted-foreground">
                        Sin llamadas para este período y filtros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── New Call Dialog ── */}
      {newOpen && (
        <NewCallDialog
          closers={closers}
          owner={owner}
          onClose={() => setNewOpen(false)}
          onSaved={fetchData}
        />
      )}

      {/* ── Detail Dialog ── */}
      {selected && (
        <DetailDialog
          call={selected}
          closers={closers}
          owner={owner}
          onClose={() => setSelected(null)}
          onSaved={() => { fetchData(); setSelected(null); }}
        />
      )}
    </div>
  );
}
