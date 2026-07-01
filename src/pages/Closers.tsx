import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Phone, Users, CheckCircle, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, isBefore, isAfter, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type CallStatus = 'pendiente' | 'realizada' | 'no_asistio' | 'reagendada' | 'cancelada';
type Preset     = '7d' | '30d' | '90d' | 'all';

interface CloserRow { id: string; name: string; }

interface Call {
  id: string;
  closer_id: string | null;
  setter_id: string | null;
  lead_name: string;
  lead_email: string | null;
  lead_phone: string | null;
  first_call_attended: boolean;
  qualified: boolean | null;
  first_call_status: CallStatus;
  first_call_date: string | null;
  rescheduled_date: string | null;
  second_call_status: CallStatus | null;
  second_call_date: string | null;
  paid: boolean;
  price: number | null;
  objections: string | null;
  notes: string | null;
  loss_reason: string | null;
  last_followup_date: string | null;
  next_followup_date: string | null;
  followup_notes: string | null;
  followup_count: number;
  sheet_row_id: string | null;
  hora_llamada: string | null;
  setter_agendo: string | null;
  fuente: string | null;
  situacion_resultado: string | null;
  num_cuotas: number | null;
  pago_en_llamada: boolean;
  nicho: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUENTES = ['LinkedIn', 'ADS', 'Referido', 'Otro'] as const;
type Fuente = typeof FUENTES[number];

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

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  realizada:  { label: 'Realizada',  cls: 'bg-success/20 text-success' },
  no_asistio: { label: 'No asistió', cls: 'bg-destructive/20 text-destructive' },
  reagendada: { label: 'Reagendada', cls: 'bg-info/20 text-info' },
  pendiente:  { label: 'Pendiente',  cls: 'bg-secondary text-muted-foreground' },
  cancelada:  { label: 'Cancelada',  cls: 'bg-destructive/20 text-destructive' },
};

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

function getDateRange(p: Preset): { since: string | null; until: string | null } {
  if (p === 'all') return { since: null, until: null };
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
  return {
    since: format(subDays(new Date(), days), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd'),
  };
}

function inRange(dateStr: string | null, since: string | null, until: string | null): boolean {
  if (!since) return true;
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return !isBefore(d, parseISO(since)) && !isAfter(d, parseISO(until! + 'T23:59:59'));
  } catch { return false; }
}

function callFuente(c: Call): Fuente {
  const f = c.fuente as Fuente | null;
  return FUENTES.includes(f as Fuente) ? f! : 'Otro';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const s = STATUS_STYLE[status];
  return s
    ? <Badge className={cn('text-xs border-0', s.cls)}>{s.label}</Badge>
    : <span className="text-xs text-muted-foreground">{status}</span>;
}

// ─── SituacionSelect ──────────────────────────────────────────────────────────

function SituacionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Situación…" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="">—</SelectItem>
        {SITUACIONES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── FunnelCard ───────────────────────────────────────────────────────────────

function FunnelCard({ total, asistieron, calificados, cerrados }: {
  total: number; asistieron: number; calificados: number; cerrados: number;
}) {
  const stages = [
    { label: 'Agendas',     value: total,       w: 100,                                                   color: 'bg-primary/20 border-primary/30',  text: 'text-primary' },
    { label: 'Asistieron',  value: asistieron,  w: total       ? Math.max(20, (asistieron  / total)       * 100) : 20, color: 'bg-info/20 border-info/30',        text: 'text-info' },
    { label: 'Calificados', value: calificados, w: total       ? Math.max(12, (calificados / total)       * 100) : 12, color: 'bg-warning/20 border-warning/30',   text: 'text-warning' },
    { label: 'Cerrados',    value: cerrados,    w: total       ? Math.max(6,  (cerrados    / total)       * 100) : 6,  color: 'bg-success/20 border-success/30',   text: 'text-success' },
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

function FollowUpsCard({ calls, closerMap }: { calls: Call[]; closerMap: Record<string, string> }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pending = [...calls]
    .filter(c => c.qualified && !c.paid)
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
                <p className="text-xs text-muted-foreground">{c.nicho ? `${c.nicho} · ` : ''}{closerMap[c.closer_id ?? ''] ?? 'Sin asignar'}</p>
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

// ─── FuenteTable ─────────────────────────────────────────────────────────────

function FuenteTable({ calls }: { calls: Call[] }) {
  const rows = FUENTES.map(f => {
    const fc = calls.filter(c => callFuente(c) === f);
    const total       = fc.length;
    const asistieron  = fc.filter(c => c.first_call_attended).length;
    const calificados = fc.filter(c => c.qualified === true).length;
    const cerrados    = fc.filter(c => c.paid).length;
    const revenue     = fc.filter(c => c.paid).reduce((s, c) => s + (c.price ?? 0), 0);
    const aov         = cerrados ? Math.round(revenue / cerrados) : 0;
    return { f, total, asistieron, calificados, cerrados, revenue, aov };
  });

  const tot = {
    total:       rows.reduce((s, r) => s + r.total, 0),
    asistieron:  rows.reduce((s, r) => s + r.asistieron, 0),
    calificados: rows.reduce((s, r) => s + r.calificados, 0),
    cerrados:    rows.reduce((s, r) => s + r.cerrados, 0),
    revenue:     rows.reduce((s, r) => s + r.revenue, 0),
  };

  const Cell = ({ val, den, good, ok, prefix = '' }: { val: number; den: number; good: number; ok: number; prefix?: string }) => {
    const r = den ? Math.round((val / den) * 100) : 0;
    return (
      <TableCell className="text-center">
        <span className={cn('text-xs font-medium', r > 0 ? rateColor(r, good, ok) : 'text-muted-foreground')}>
          {prefix}{r}%
        </span>
      </TableCell>
    );
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Rendimiento por Fuente</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fuente</TableHead>
              <TableHead className="text-center">Agendadas</TableHead>
              <TableHead className="text-center">Asistieron</TableHead>
              <TableHead className="text-center">Show%</TableHead>
              <TableHead className="text-center">Calificados</TableHead>
              <TableHead className="text-center">Qual%</TableHead>
              <TableHead className="text-center">Cierres</TableHead>
              <TableHead className="text-center">Close%</TableHead>
              <TableHead className="text-center">AOV</TableHead>
              <TableHead className="text-center">Ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.f}>
                <TableCell className="font-medium text-sm">{r.f}</TableCell>
                <TableCell className="text-center text-sm">{r.total || '—'}</TableCell>
                <TableCell className="text-center text-sm">{r.asistieron || '—'}</TableCell>
                <Cell val={r.asistieron} den={r.total} good={70} ok={50} />
                <TableCell className="text-center text-sm">{r.calificados || '—'}</TableCell>
                <Cell val={r.calificados} den={r.asistieron} good={50} ok={30} />
                <TableCell className="text-center text-sm">{r.cerrados || '—'}</TableCell>
                <Cell val={r.cerrados} den={r.calificados} good={25} ok={15} />
                <TableCell className="text-center text-sm">{r.aov ? `$${r.aov.toLocaleString()}` : '—'}</TableCell>
                <TableCell className="text-center text-sm font-medium">{r.revenue ? `$${r.revenue.toLocaleString()}` : '—'}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-semibold bg-secondary/20">
              <TableCell>Total</TableCell>
              <TableCell className="text-center">{tot.total}</TableCell>
              <TableCell className="text-center">{tot.asistieron}</TableCell>
              <TableCell className="text-center text-xs">{pct(tot.asistieron, tot.total)}</TableCell>
              <TableCell className="text-center">{tot.calificados}</TableCell>
              <TableCell className="text-center text-xs">{pct(tot.calificados, tot.asistieron)}</TableCell>
              <TableCell className="text-center">{tot.cerrados}</TableCell>
              <TableCell className="text-center text-xs">{pct(tot.cerrados, tot.calificados)}</TableCell>
              <TableCell className="text-center text-sm">{tot.cerrados ? `$${Math.round(tot.revenue / tot.cerrados).toLocaleString()}` : '—'}</TableCell>
              <TableCell className="text-center text-sm">{tot.revenue ? `$${tot.revenue.toLocaleString()}` : '—'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── NewCallDialog ────────────────────────────────────────────────────────────

type NewForm = {
  lead_name: string; lead_email: string; lead_phone: string;
  first_call_date: string; hora_llamada: string;
  fuente: string; setter_agendo: string; nicho: string; closer_id: string;
};
const EMPTY_NEW: NewForm = {
  lead_name: '', lead_email: '', lead_phone: '',
  first_call_date: '', hora_llamada: '',
  fuente: '', setter_agendo: '', nicho: '', closer_id: '',
};

function NewCallDialog({ closers, onClose, onSaved }: {
  closers: CloserRow[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<NewForm>(EMPTY_NEW);
  const [saving, setSaving] = useState(false);

  function upd(k: keyof NewForm, v: string) { setF(p => ({ ...p, [k]: v })); }

  async function save() {
    if (!f.lead_name.trim()) { toast.error('El nombre del lead es requerido'); return; }
    setSaving(true);
    const { error } = await supabase.from('closer_calls').insert({
      lead_name:           f.lead_name.trim(),
      lead_email:          f.lead_email    || null,
      lead_phone:          f.lead_phone    || null,
      first_call_date:     f.first_call_date || null,
      hora_llamada:        f.hora_llamada  || null,
      fuente:              f.fuente        || null,
      setter_agendo:       f.setter_agendo || null,
      nicho:               f.nicho         || null,
      closer_id:           f.closer_id     || null,
      first_call_status:   'pendiente',
      first_call_attended: false,
      paid:                false,
      pago_en_llamada:     false,
      followup_count:      0,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear la agenda'); return; }
    toast.success('Agenda creada');
    onSaved(); onClose();
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

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
          <F label="Fecha 1ra llamada">
            <Input type="date" value={f.first_call_date} onChange={e => upd('first_call_date', e.target.value)} className="bg-secondary/50 h-9" />
          </F>
          <F label="Hora">
            <Input value={f.hora_llamada} onChange={e => upd('hora_llamada', e.target.value)} className="bg-secondary/50" placeholder="ej. 14:30" />
          </F>
          <F label="Fuente">
            <Select value={f.fuente} onValueChange={v => upd('fuente', v)}>
              <SelectTrigger className="bg-secondary/50 h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {FUENTES.map(fu => <SelectItem key={fu} value={fu}>{fu}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Setter que agendó">
            <Input value={f.setter_agendo} onChange={e => upd('setter_agendo', e.target.value)} className="bg-secondary/50" placeholder="Nombre del setter" />
          </F>
          <F label="Nicho">
            <Input value={f.nicho} onChange={e => upd('nicho', e.target.value)} className="bg-secondary/50" placeholder="ej. Asesor financiero" />
          </F>
          <F label="Closer">
            <Select value={f.closer_id} onValueChange={v => upd('closer_id', v)}>
              <SelectTrigger className="bg-secondary/50 h-9"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin asignar</SelectItem>
                {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
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
  hora_llamada: string;
  setter_agendo: string;
  fuente: string;
  nicho: string;
  situacion_resultado: string;
  first_call_status: string;
  first_call_attended: boolean;
  second_call_status: string;
  second_call_date: string;
  qualified: boolean;
  paid: boolean;
  pago_en_llamada: boolean;
  price: string;
  num_cuotas: string;
  loss_reason: string;
  objections: string;
  notes: string;
  next_followup_date: string;
  followup_notes: string;
};

function toForm(c: Call): DForm {
  return {
    hora_llamada:        c.hora_llamada        ?? '',
    setter_agendo:       c.setter_agendo       ?? '',
    fuente:              c.fuente              ?? '',
    nicho:               c.nicho               ?? '',
    situacion_resultado: c.situacion_resultado ?? '',
    first_call_status:   c.first_call_status,
    first_call_attended: c.first_call_attended,
    second_call_status:  c.second_call_status  ?? '',
    second_call_date:    c.second_call_date    ? c.second_call_date.slice(0, 10) : '',
    qualified:           c.qualified           ?? false,
    paid:                c.paid,
    pago_en_llamada:     c.pago_en_llamada,
    price:               c.price?.toString()   ?? '',
    num_cuotas:          c.num_cuotas?.toString() ?? '',
    loss_reason:         c.loss_reason         ?? '',
    objections:          c.objections          ?? '',
    notes:               c.notes               ?? '',
    next_followup_date:  c.next_followup_date  ? c.next_followup_date.slice(0, 10) : '',
    followup_notes:      c.followup_notes      ?? '',
  };
}

function DetailDialog({ call, closerMap, onClose, onSaved }: {
  call: Call; closerMap: Record<string, string>; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<DForm>(toForm(call));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function upd<K extends keyof DForm>(k: K, v: DForm[K]) {
    setF(prev => ({ ...prev, [k]: v }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('closer_calls').update({
      hora_llamada:        f.hora_llamada        || null,
      setter_agendo:       f.setter_agendo       || null,
      fuente:              f.fuente              || null,
      nicho:               f.nicho               || null,
      situacion_resultado: f.situacion_resultado || null,
      first_call_status:   f.first_call_status   || null,
      first_call_attended: f.first_call_attended,
      second_call_status:  f.second_call_status  || null,
      second_call_date:    f.second_call_date    || null,
      qualified:           f.qualified,
      paid:                f.paid,
      pago_en_llamada:     f.pago_en_llamada,
      price:               f.price       ? parseFloat(f.price)       : null,
      num_cuotas:          f.num_cuotas  ? parseInt(f.num_cuotas)    : null,
      loss_reason:         f.loss_reason         || null,
      objections:          f.objections          || null,
      notes:               f.notes               || null,
      next_followup_date:  f.next_followup_date  || null,
      followup_notes:      f.followup_notes      || null,
    }).eq('id', call.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Guardado');
    setDirty(false);
    onSaved();
  }

  async function markClosed() {
    setSaving(true);
    const { error } = await supabase.from('closer_calls').update({ paid: true }).eq('id', call.id);
    setSaving(false);
    if (error) { toast.error('Error'); return; }
    toast.success('Marcado como cerrado');
    onSaved(); onClose();
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

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
            <F label="Fecha 1ra llamada">
              <p className="text-sm bg-secondary/30 rounded px-2 py-1.5">{fmtDate(call.first_call_date)}</p>
            </F>
            <F label="Hora">
              <Input value={f.hora_llamada} onChange={e => upd('hora_llamada', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="ej. 14:30" />
            </F>
            <F label="Fuente">
              <Select value={f.fuente} onValueChange={v => upd('fuente', v)}>
                <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {FUENTES.map(fu => <SelectItem key={fu} value={fu}>{fu}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Setter que agendó">
              <Input value={f.setter_agendo} onChange={e => upd('setter_agendo', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="Nombre del setter" />
            </F>
            <F label="Nicho">
              <Input value={f.nicho} onChange={e => upd('nicho', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="ej. Asesor financiero" />
            </F>
            <F label="Closer">
              <p className="text-sm bg-secondary/30 rounded px-2 py-1.5">{closerMap[call.closer_id ?? ''] ?? 'Sin asignar'}</p>
            </F>
          </div>
        </div>

        <Separator />

        {/* ── Llamadas ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Llamadas</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Estado 1ra llamada">
              <Select value={f.first_call_status} onValueChange={v => upd('first_call_status', v)}>
                <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_STYLE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Situación / Resultado">
              <SituacionSelect value={f.situacion_resultado} onChange={v => upd('situacion_resultado', v)} />
            </F>
            <F label="Estado 2da llamada">
              <Select value={f.second_call_status} onValueChange={v => upd('second_call_status', v)}>
                <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {Object.entries(STATUS_STYLE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Fecha 2da llamada">
              <Input type="date" value={f.second_call_date} onChange={e => upd('second_call_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
          </div>
          <div className="flex gap-6 mt-3">
            {([
              ['first_call_attended', 'Asistió'] as const,
              ['qualified',           'Calificado'] as const,
            ]).map(([field, lbl]) => (
              <div key={field} className="flex items-center gap-2">
                <Checkbox
                  checked={f[field]}
                  onCheckedChange={v => upd(field, !!v)}
                  id={`dlg-${field}`}
                />
                <Label htmlFor={`dlg-${field}`} className="text-sm cursor-pointer">{lbl}</Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Resultado ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resultado</p>
          <div className="flex flex-wrap gap-6 mb-3">
            {([
              ['paid',             'Cerrado / Pagado'] as const,
              ['pago_en_llamada',  'Pagó en llamada']  as const,
            ]).map(([field, lbl]) => (
              <div key={field} className="flex items-center gap-2">
                <Checkbox
                  checked={f[field]}
                  onCheckedChange={v => upd(field, !!v)}
                  id={`dlg-${field}`}
                />
                <Label htmlFor={`dlg-${field}`} className="text-sm cursor-pointer">{lbl}</Label>
              </div>
            ))}
          </div>
          {f.paid && (
            <div className="grid grid-cols-2 gap-3">
              <F label="Precio (USD)">
                <Input type="number" value={f.price} onChange={e => upd('price', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="3000" />
              </F>
              <F label="Número de cuotas">
                <Input type="number" min={1} value={f.num_cuotas} onChange={e => upd('num_cuotas', e.target.value)} className="bg-secondary/50 h-8 text-sm" placeholder="1" />
              </F>
            </div>
          )}
          {f.qualified && !f.paid && (
            <div className="mt-3">
              <F label="Motivo de no cierre">
                <Select value={f.loss_reason} onValueChange={v => upd('loss_reason', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Seleccioná un motivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin especificar</SelectItem>
                    {LOSS_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Notas ── */}
        <div className="grid grid-cols-2 gap-3">
          <F label="Objeciones">
            <Textarea rows={2} value={f.objections} onChange={e => upd('objections', e.target.value)} className="bg-secondary/50 text-sm resize-none" placeholder="Objeciones en la llamada…" />
          </F>
          <F label="Notas generales">
            <Textarea rows={2} value={f.notes} onChange={e => upd('notes', e.target.value)} className="bg-secondary/50 text-sm resize-none" placeholder="Observaciones…" />
          </F>
        </div>

        <Separator />

        {/* ── Follow-up ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Follow-up</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Próxima fecha">
              <Input type="date" value={f.next_followup_date} onChange={e => upd('next_followup_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
            </F>
            <div />
            <div className="col-span-2">
              <F label="Notas de follow-up">
                <Textarea rows={2} value={f.followup_notes} onChange={e => upd('followup_notes', e.target.value)} className="bg-secondary/50 text-sm resize-none" placeholder="Qué se habló, qué sigue…" />
              </F>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-1">
          {f.qualified && !f.paid
            ? <Button variant="outline" size="sm" onClick={markClosed} disabled={saving} className="text-success border-success/40 hover:bg-success/10">
                <CheckCircle className="h-4 w-4 mr-1" />Marcar como cerrado
              </Button>
            : <div />}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Closers() {
  const [calls, setCalls]       = useState<Call[]>([]);
  const [closers, setClosers]   = useState<CloserRow[]>([]);
  const [loading, setLoading]   = useState(true);

  const [preset, setPreset]               = useState<Preset>('all');
  const [globalFuente, setGlobalFuente]   = useState('all');

  const [filterCloser, setFilterCloser]   = useState('all');
  const [filterFuente, setFilterFuente]   = useState('all');
  const [filterNicho, setFilterNicho]     = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterQual, setFilterQual]       = useState('all');

  const [selected, setSelected] = useState<Call | null>(null);
  const [newOpen, setNewOpen]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, callRes] = await Promise.all([
      supabase.from('closers').select('id, name').order('name'),
      supabase.from('closer_calls').select('*').order('first_call_date', { ascending: false }),
    ]);
    if (cRes.data)   setClosers(cRes.data);
    if (callRes.data) setCalls(callRes.data.map(c => ({ ...c, followup_count: c.followup_count ?? 0, pago_en_llamada: c.pago_en_llamada ?? false })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closerMap: Record<string, string> = Object.fromEntries(closers.map(c => [c.id, c.name]));

  // Date + global fuente filter → used for KPIs and funnel
  const { since, until } = getDateRange(preset);
  const dateCalls = calls.filter(c => inRange(c.first_call_date, since, until));
  const viewCalls = globalFuente === 'all'
    ? dateCalls
    : dateCalls.filter(c => callFuente(c) === globalFuente);

  // KPIs
  const total       = viewCalls.length;
  const asistieron  = viewCalls.filter(c => c.first_call_attended).length;
  const calificados = viewCalls.filter(c => c.qualified === true).length;
  const cerrados    = viewCalls.filter(c => c.paid).length;
  const revenue     = viewCalls.filter(c => c.paid).reduce((s, c) => s + (c.price ?? 0), 0);
  const showRate    = total       ? Math.round((asistieron  / total)       * 100) : 0;
  const qualRate    = asistieron  ? Math.round((calificados / asistieron)  * 100) : 0;
  const closeRate   = calificados ? Math.round((cerrados    / calificados) * 100) : 0;

  const kpis = [
    { label: 'Agendas',     value: total,                          icon: Phone,       cls: '' },
    { label: 'Show Rate',   value: `${showRate}%`,                 icon: Users,       cls: rateColor(showRate,  70, 50) },
    { label: 'Calificados', value: calificados,                    icon: CheckCircle, cls: '' },
    { label: 'Tasa Calif.', value: `${qualRate}%`,                 icon: TrendingUp,  cls: rateColor(qualRate,  50, 30) },
    { label: 'Cerrados',    value: cerrados,                       icon: DollarSign,  cls: '' },
    { label: 'Tasa Cierre', value: `${closeRate}%`,                icon: TrendingUp,  cls: rateColor(closeRate, 25, 15) },
    { label: 'Revenue',     value: `$${revenue.toLocaleString()}`, icon: DollarSign,  cls: revenue > 0 ? 'text-success' : '' },
  ];

  // Table filter (on top of viewCalls)
  const nichoLC = filterNicho.toLowerCase();
  const tableCalls = viewCalls.filter(c => {
    if (filterCloser !== 'all' && c.closer_id !== filterCloser) return false;
    if (filterFuente !== 'all' && callFuente(c) !== filterFuente) return false;
    if (nichoLC && !(c.nicho ?? '').toLowerCase().includes(nichoLC)) return false;
    if (filterStatus !== 'all' && c.first_call_status !== filterStatus) return false;
    if (filterQual === 'yes' && c.qualified !== true) return false;
    if (filterQual === 'no'  && c.qualified !== false) return false;
    return true;
  });

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
        <Select value={globalFuente} onValueChange={setGlobalFuente}>
          <SelectTrigger className="w-36 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fuentes</SelectItem>
            {FUENTES.map(fu => <SelectItem key={fu} value={fu}>{fu}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {(['7d', '30d', '90d', 'all'] as Preset[]).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={cn(
                'px-3 py-1 rounded text-sm transition-all',
                preset === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p === 'all' ? 'Todo' : p}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-7 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="bg-card border-border/50">
              <CardContent className="p-4 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className={cn('text-xl font-bold', k.cls)}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Funnel + Follow-ups ── */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <FunnelCard total={total} asistieron={asistieron} calificados={calificados} cerrados={cerrados} />
        </div>
        <div className="col-span-2">
          <FollowUpsCard calls={calls} closerMap={closerMap} />
        </div>
      </div>

      {/* ── Rendimiento por Fuente ── */}
      <FuenteTable calls={dateCalls} />

      {/* ── Calls Table ── */}
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
                {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterFuente} onValueChange={setFilterFuente}>
              <SelectTrigger className="w-32 h-8 bg-secondary/50 text-sm"><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {FUENTES.map(fu => <SelectItem key={fu} value={fu}>{fu}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={filterNicho}
              onChange={e => setFilterNicho(e.target.value)}
              placeholder="Nicho…"
              className="w-32 h-8 bg-secondary/50 text-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-8 bg-secondary/50 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_STYLE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterQual} onValueChange={setFilterQual}>
              <SelectTrigger className="w-36 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Calificación: todos</SelectItem>
                <SelectItem value="yes">Solo calificados</SelectItem>
                <SelectItem value="no">No calificados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Closer</TableHead>
                <TableHead>Setter agendó</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Calificado</TableHead>
                <TableHead>Situación</TableHead>
                <TableHead>Cerrado</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableCalls.map(call => (
                <TableRow
                  key={call.id}
                  className="cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setSelected(call)}
                >
                  <TableCell className="font-medium">{call.lead_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDate(call.first_call_date)}{call.hora_llamada ? ` ${call.hora_llamada}` : ''}
                  </TableCell>
                  <TableCell>
                    {call.fuente
                      ? <Badge className="text-xs border-0 bg-secondary text-foreground">{call.fuente}</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <span
                      title={call.nicho ?? undefined}
                      className="text-sm block max-w-[110px] truncate"
                    >
                      {call.nicho ?? <span className="text-muted-foreground">—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {closerMap[call.closer_id ?? ''] ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {call.setter_agendo ?? '—'}
                  </TableCell>
                  <TableCell><StatusBadge status={call.first_call_status} /></TableCell>
                  <TableCell>
                    {call.qualified === true  ? <Badge className="text-xs border-0 bg-success/20 text-success">Sí</Badge>
                   : call.qualified === false ? <Badge className="text-xs border-0 bg-destructive/20 text-destructive">No</Badge>
                   : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {call.situacion_resultado ?? '—'}
                  </TableCell>
                  <TableCell>
                    {call.paid
                      ? <Badge className="text-xs border-0 bg-success/20 text-success">Sí</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {call.price
                      ? `$${call.price.toLocaleString()}${call.num_cuotas && call.num_cuotas > 1 ? ` ×${call.num_cuotas}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {call.next_followup_date
                      ? <span className="text-xs text-warning">{fmtDate(call.next_followup_date)}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              {tableCalls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    Sin llamadas para este período y filtros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── New Call Dialog ── */}
      {newOpen && (
        <NewCallDialog
          closers={closers}
          onClose={() => setNewOpen(false)}
          onSaved={fetchData}
        />
      )}

      {/* ── Detail Dialog ── */}
      {selected && (
        <DetailDialog
          call={selected}
          closerMap={closerMap}
          onClose={() => setSelected(null)}
          onSaved={() => { fetchData(); setSelected(null); }}
        />
      )}
    </div>
  );
}
