import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  getCpbcThresholds, getHealthStatus, auditPeriod,
  type HealthStatus, type AuditRecommendation, type CpbcThresholds,
} from '@/lib/ads-audit';
import { BarChart2, Loader2, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { format, parseISO, isValid, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRaw {
  fecha: string;
  inversion: number | null;
  impresiones: number | null;
  clics: number | null;
  ctr: number | null;
  cpl: number | null;
  cpbc: number | null;
  typeforms: number | null;
  typeforms_calificados: number | null;
  asistencia: number | null;
  calificados: number | null;
  cerrados: number | null;
}

interface DailyAgg {
  fecha: string;
  inversion: number;
  impresiones: number;
  clics: number;
  typeforms: number;
  typeforms_calificados: number;
  asistencia: number;
  calificados: number;
  cerrados: number;
  ctr: number;
  cpl: number;
  cpbc: number;
}

interface WeeklyMetric {
  week_start: string;
  week_end: string | null;
  ads_investment: number | null;
  ads_leads: number | null;
  ads_cpl: number | null;
  ads_qualified_leads: number | null;
  ads_bookings: number | null;
  ads_cpbc: number | null;
  ads_show_rate: number | null;
  ads_close_rate: number | null;
}

type Preset = '7d' | '30d' | '90d' | 'custom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n   = (v: number | null | undefined, dec = 0) =>
  v == null ? '—' : v.toLocaleString('es-ES', { maximumFractionDigits: dec });
const usd = (v: number | null | undefined) =>
  v == null ? '—' : `$${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;
const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${v.toFixed(1)}%`;

function fmtDate(s: string | null) {
  if (!s) return '—';
  try { const d = parseISO(s); return isValid(d) ? format(d, 'd MMM', { locale: es }) : s; }
  catch { return s; }
}

function fmtWeek(start: string, end: string | null) {
  try {
    const s = parseISO(start), e = end ? parseISO(end) : null;
    if (e && isValid(s) && isValid(e))
      return `${format(s, 'd MMM', { locale: es })} – ${format(e, 'd MMM', { locale: es })}`;
    return isValid(s) ? format(s, 'd MMM yyyy', { locale: es }) : start;
  } catch { return start; }
}

function cpbcColor(v: number | null, T: CpbcThresholds) {
  if (v == null) return 'text-foreground';
  if (v <= T.excellent) return 'text-success';
  if (v <= T.good)      return 'text-warning';
  return 'text-destructive';
}

function rateColor(v: number | null) {
  if (v == null) return '';
  if (v >= 60) return 'text-success';
  if (v >= 30) return 'text-warning';
  return 'text-destructive';
}

function aggregate(rows: DailyRaw[]): DailyAgg[] {
  const map: Record<string, DailyAgg> = {};
  for (const r of rows) {
    if (!r.fecha) continue;
    if (!map[r.fecha]) {
      map[r.fecha] = {
        fecha: r.fecha,
        inversion: 0, impresiones: 0, clics: 0,
        typeforms: 0, typeforms_calificados: 0,
        asistencia: 0, calificados: 0, cerrados: 0,
        ctr: 0, cpl: 0, cpbc: 0,
      };
    }
    const a = map[r.fecha];
    a.inversion   += r.inversion   ?? 0;
    a.impresiones += r.impresiones ?? 0;
    a.clics       += r.clics       ?? 0;
    a.typeforms   += r.typeforms   ?? 0;
    a.typeforms_calificados += r.typeforms_calificados ?? 0;
    a.asistencia  += r.asistencia  ?? 0;
    a.calificados += r.calificados ?? 0;
    a.cerrados    += r.cerrados    ?? 0;
  }
  return Object.values(map)
    .map(a => ({
      ...a,
      ctr:  a.impresiones > 0 ? (a.clics / a.impresiones) * 100 : 0,
      cpl:  a.typeforms > 0   ? a.inversion / a.typeforms : 0,
      cpbc: a.typeforms_calificados > 0 ? a.inversion / a.typeforms_calificados : 0,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha)); // ascending for chart
}

function getDateRange(preset: Preset, customSince: string, customUntil: string) {
  const today = new Date();
  const until = today.toISOString().slice(0, 10);
  if (preset === 'custom') return { since: customSince || until, until: customUntil || until };
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const since = subDays(today, days).toISOString().slice(0, 10);
  return { since, until };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// DateRangePicker
function DateRangePicker({
  preset, onPreset, customSince, customUntil, onCustomSince, onCustomUntil, onApply,
}: {
  preset: Preset;
  onPreset: (p: Preset) => void;
  customSince: string;
  customUntil: string;
  onCustomSince: (s: string) => void;
  onCustomUntil: (s: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={preset} onValueChange={v => onPreset(v as Preset)}>
        <SelectTrigger className="bg-secondary/50 w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Última semana</SelectItem>
          <SelectItem value="30d">Últimos 30 días</SelectItem>
          <SelectItem value="90d">Últimos 90 días</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {preset === 'custom' && (
        <>
          <Input type="date" value={customSince} onChange={e => onCustomSince(e.target.value)}
            className="bg-secondary/50 h-8 text-xs w-36" />
          <span className="text-xs text-muted-foreground">a</span>
          <Input type="date" value={customUntil} onChange={e => onCustomUntil(e.target.value)}
            className="bg-secondary/50 h-8 text-xs w-36" />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onApply}>
            Aplicar
          </Button>
        </>
      )}
    </div>
  );
}

// HealthBanner
const HEALTH_CONFIG: Record<HealthStatus, { label: string; desc: (T: CpbcThresholds) => string; border: string; bg: string; dot: string; text: string }> = {
  excellent: {
    label: 'Excelente', border: 'border-success/30', bg: 'bg-success/5', dot: 'bg-success', text: 'text-success',
    desc: T => `CPBC por debajo del objetivo excelente ($${T.excellent.toFixed(0)})`,
  },
  good: {
    label: 'Bueno', border: 'border-primary/30', bg: 'bg-primary/5', dot: 'bg-primary', text: 'text-primary',
    desc: T => `CPBC dentro del benchmark ($${T.good.toFixed(0)} objetivo)`,
  },
  warning: {
    label: 'Atención', border: 'border-warning/30', bg: 'bg-warning/5', dot: 'bg-warning', text: 'text-warning',
    desc: T => `CPBC por encima del objetivo (>${T.good.toFixed(0)})`,
  },
  critical: {
    label: 'Crítico', border: 'border-destructive/30', bg: 'bg-destructive/5', dot: 'bg-destructive', text: 'text-destructive',
    desc: T => `CPBC muy alto (>${T.warning.toFixed(0)}) — requiere acción inmediata`,
  },
};

function HealthBannerWidget({ status, cpbc, thresholds }: { status: HealthStatus; cpbc: number | null; thresholds: CpbcThresholds }) {
  const cfg = HEALTH_CONFIG[status];
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 rounded-lg border', cfg.border, cfg.bg)}>
      <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', cfg.dot)} />
      <span className={cn('font-semibold text-sm', cfg.text)}>{cfg.label}</span>
      <span className="text-sm text-muted-foreground hidden sm:inline">— {cfg.desc(thresholds)}</span>
      {cpbc != null && (
        <span className={cn('ml-auto font-mono text-sm font-bold', cfg.text)}>
          CPBC ${Math.round(cpbc)}
        </span>
      )}
    </div>
  );
}

// AuditPanel
const SEV: Record<string, { badge: string; label: string; icon: string }> = {
  critical:    { badge: 'bg-destructive/15 text-destructive border border-destructive/30', label: 'CRÍTICO',    icon: '🔴' },
  warning:     { badge: 'bg-warning/15 text-warning border border-warning/30',             label: 'ALERTA',     icon: '⚠️' },
  opportunity: { badge: 'bg-success/15 text-success border border-success/30',             label: 'OPORTUNIDAD', icon: '🟢' },
  info:        { badge: 'bg-secondary text-muted-foreground border border-border',         label: 'INFO',       icon: 'ℹ️' },
};

function AuditPanelWidget({ recommendations }: { recommendations: AuditRecommendation[] }) {
  const [expanded, setExpanded] = useState(true);
  const criticals   = recommendations.filter(r => r.severity === 'critical').length;
  const warnings    = recommendations.filter(r => r.severity === 'warning').length;
  const opps        = recommendations.filter(r => r.severity === 'opportunity').length;
  const isEmpty     = recommendations.length === 0;

  return (
    <Card className="bg-card border-border/50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/20 transition-colors rounded-t-lg"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">🧠 Auditor</span>
          {isEmpty ? (
            <Badge className="bg-success/15 text-success border border-success/30 text-xs">Todo en orden ✓</Badge>
          ) : (
            <>
              {criticals > 0 && <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs">{criticals} crítico{criticals > 1 ? 's' : ''}</Badge>}
              {warnings  > 0 && <Badge className="bg-warning/15 text-warning border border-warning/30 text-xs">{warnings} alerta{warnings > 1 ? 's' : ''}</Badge>}
              {opps      > 0 && <Badge className="bg-success/15 text-success border border-success/30 text-xs">{opps} oportunidad{opps > 1 ? 'es' : ''}</Badge>}
            </>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && !isEmpty && (
        <CardContent className="pt-0 pb-4 px-4 space-y-3">
          {recommendations.map(rec => {
            const s = SEV[rec.severity];
            return (
              <div key={rec.id} className="rounded-lg border border-border/30 bg-secondary/20 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs border-0 px-1.5', s.badge.replace('border border-', ''))}>
                    {s.icon} {s.label}
                  </Badge>
                  {rec.metric && rec.metricValue != null && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {rec.metric}: {rec.metric === 'CPBC' || rec.metric === 'Gasto' ? `$${Math.round(rec.metricValue)}` : `${rec.metricValue.toFixed(rec.metric === 'CTR' || rec.metric.includes('Tasa') || rec.metric === 'Show rate' ? 1 : 0)}${rec.metric === 'CTR' || rec.metric.includes('Tasa') || rec.metric === 'Show rate' ? '%' : ''}`}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
                <div className="flex items-start gap-1 text-xs text-muted-foreground/80 pt-0.5">
                  <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{rec.action}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// TimeseriesChart
function formatXDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'd MMM', { locale: es }); } catch { return dateStr; }
}

function fmtAxis(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const inv  = payload.find((p: any) => p.dataKey === 'inversion');
  const cpbc = payload.find((p: any) => p.dataKey === 'cpbc');
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg min-w-32">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {inv  && <p className="text-foreground">Inversión: <span className="font-bold">${Math.round(inv.value).toLocaleString()}</span></p>}
      {cpbc && cpbc.value > 0 && <p className="text-foreground mt-0.5">CPBC: <span className="font-bold">${Math.round(cpbc.value)}</span></p>}
    </div>
  );
}

function TimeseriesChartWidget({ daily, thresholds }: { daily: DailyAgg[]; thresholds: CpbcThresholds }) {
  const chartData = useMemo(() => daily.map(d => ({
    date: formatXDate(d.fecha),
    inversion: d.inversion,
    cpbc: d.typeforms_calificados > 0 ? d.cpbc : null,
  })), [daily]);

  const invValues = daily.map(d => d.inversion).filter(v => v > 0);
  const cpbcValues = daily.filter(d => d.typeforms_calificados > 0).map(d => d.cpbc).filter(v => v > 0);

  if (chartData.length === 0) return null;

  const minInv = invValues.length ? Math.min(...invValues) : 0;
  const avgInv = invValues.length ? invValues.reduce((a, b) => a + b, 0) / invValues.length : 0;
  const maxInv = invValues.length ? Math.max(...invValues) : 0;
  const avgCpbc = cpbcValues.length ? cpbcValues.reduce((a, b) => a + b, 0) / cpbcValues.length : null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Inversión diaria / CPBC
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Min <b className="text-foreground">{usd(minInv)}</b></span>
            <span>Prom <b className="text-foreground">{usd(avgInv)}</b></span>
            <span>Max <b className="text-foreground">{usd(maxInv)}</b></span>
            {avgCpbc && <span>CPBC prom <b className="text-foreground">${Math.round(avgCpbc)}</b></span>}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-4 rounded-sm bg-primary/70" />Inversión (eje izq.)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-px w-4 border-t-2 border-dashed border-warning" />CPBC (eje der.)
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 56, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="invGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              interval="preserveStartEnd"
            />
            {/* Left Y — inversión */}
            <YAxis
              yAxisId="left"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={fmtAxis}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            {/* Right Y — CPBC */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={v => `$${v}`}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }} />
            {/* CPBC thresholds as reference lines */}
            <ReferenceLine yAxisId="right" y={thresholds.excellent} stroke="hsl(var(--success))"    strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.6} label={{ value: `Exc $${Math.round(thresholds.excellent)}`, position: 'insideTopRight', fontSize: 9, fill: 'hsl(var(--success))' }} />
            <ReferenceLine yAxisId="right" y={thresholds.good}      stroke="hsl(var(--warning))"    strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.6} label={{ value: `Obj $${Math.round(thresholds.good)}`, position: 'insideTopRight', fontSize: 9, fill: 'hsl(var(--warning))' }} />
            <ReferenceLine yAxisId="right" y={thresholds.warning}   stroke="hsl(var(--destructive))" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.6} label={{ value: `Crít $${Math.round(thresholds.warning)}`, position: 'insideTopRight', fontSize: 9, fill: 'hsl(var(--destructive))' }} />
            {/* Inversión — area, left axis */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="inversion"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#invGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
            {/* CPBC — dashed line, right axis */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cpbc"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: 'hsl(var(--warning))', stroke: 'hsl(var(--card))', strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

export default function TabMetaAds({ clientId }: Props) {
  const [daily,  setDaily]  = useState<DailyAgg[]>([]);
  const [weekly, setWeekly] = useState<WeeklyMetric[]>([]);
  const [precio, setPrecio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Date range
  const [preset,      setPreset]      = useState<Preset>('30d');
  const [customSince, setCustomSince] = useState('');
  const [customUntil, setCustomUntil] = useState('');
  const [appliedRange, setAppliedRange] = useState(() => getDateRange('30d', '', ''));

  const applyCustom = () => setAppliedRange(getDateRange('custom', customSince, customUntil));

  // When preset changes (non-custom), update range immediately
  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setAppliedRange(getDateRange(p, customSince, customUntil));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Step 1 — campaign IDs for this client
    const { data: campanas } = await supabase
      .from('ads_campanas')
      .select('id')
      .eq('client_id', clientId);
    const campanaIds = (campanas ?? []).map((c: { id: string }) => c.id);

    // Step 2 — parallel fetch
    const [dailyRes, weeklyRes, csbRes] = await Promise.all([
      campanaIds.length > 0
        ? supabase
            .from('ads_metricas_diarias')
            .select('fecha, inversion, impresiones, clics, ctr, cpl, cpbc, typeforms, typeforms_calificados, asistencia, calificados, cerrados')
            .in('campana_id', campanaIds)
            .gte('fecha', appliedRange.since)
            .lte('fecha', appliedRange.until)
            .order('fecha', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from('client_metrics')
        .select('week_start, week_end, ads_investment, ads_leads, ads_cpl, ads_qualified_leads, ads_bookings, ads_cpbc, ads_show_rate, ads_close_rate')
        .eq('client_id', clientId)
        .order('week_start', { ascending: false })
        .limit(8),
      supabase
        .from('client_csb')
        .select('precio')
        .eq('client_id', clientId)
        .maybeSingle(),
    ]);

    setDaily(aggregate((dailyRes.data ?? []) as DailyRaw[]));
    setWeekly((weeklyRes.data ?? []) as WeeklyMetric[]);
    setPrecio((csbRes.data as any)?.precio ?? null);
    setLoading(false);
  }, [clientId, appliedRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const thresholds = useMemo(() => getCpbcThresholds(precio), [precio]);

  const totalInversion  = daily.reduce((s, d) => s + d.inversion, 0);
  const totalTypeforms  = daily.reduce((s, d) => s + d.typeforms, 0);
  const totalCalif      = daily.reduce((s, d) => s + d.typeforms_calificados, 0);
  const totalAsistencia = daily.reduce((s, d) => s + d.asistencia, 0);
  const totalCerrados   = daily.reduce((s, d) => s + d.cerrados, 0);
  const globalCPBC      = totalCalif > 0 ? totalInversion / totalCalif : null;
  const globalCPL       = totalTypeforms > 0 ? totalInversion / totalTypeforms : null;
  const avgCtr          = daily.length > 0
    ? daily.filter(d => d.impresiones > 0).reduce((s, d) => s + d.ctr, 0) /
      Math.max(daily.filter(d => d.impresiones > 0).length, 1)
    : 0;

  const latestWeek = weekly[0] ?? null;

  const headerCPBC      = latestWeek?.ads_cpbc       ?? globalCPBC;
  const headerInversion = latestWeek?.ads_investment  ?? (totalInversion || null);
  const headerLeads     = latestWeek?.ads_leads       ?? (totalTypeforms || null);
  const headerCalif     = latestWeek?.ads_qualified_leads ?? (totalCalif || null);
  const headerShowRate  = latestWeek?.ads_show_rate   ?? null;
  const headerCloseRate = latestWeek?.ads_close_rate  ?? null;

  // Use header values (already fall back to weekly data) so audit works even with no daily rows
  const auditInput = {
    totalInversion:   headerInversion ?? totalInversion,
    totalTypeforms:   headerLeads     ?? totalTypeforms,
    totalCalificados: headerCalif     ?? totalCalif,
    totalAsistencia,
    totalCerrados,
    avgCpbc: headerCPBC,
    avgCpl:  globalCPL,
    avgCtr,
    precio,
  };
  const healthStatus  = useMemo(() => getHealthStatus(auditInput), [JSON.stringify(auditInput)]);
  const auditResults  = useMemo(() => auditPeriod(auditInput),     [JSON.stringify(auditInput)]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const hasData = daily.length > 0 || weekly.length > 0;

  if (!hasData) return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-center border border-dashed border-border/50 rounded-lg">
      <BarChart2 className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Sin métricas de Meta Ads para este cliente</p>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Date range picker ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart2 className="h-3.5 w-3.5" />
          <span>{appliedRange.since} → {appliedRange.until}</span>
          {thresholds.usingPrice && (
            <Badge variant="outline" className="text-xs">Thresholds por precio del cliente</Badge>
          )}
        </div>
        <DateRangePicker
          preset={preset} onPreset={handlePreset}
          customSince={customSince} customUntil={customUntil}
          onCustomSince={setCustomSince} onCustomUntil={setCustomUntil}
          onApply={applyCustom}
        />
      </div>

      {/* ── KPI Header ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        {/* CPBC — estrella */}
        <Card className="col-span-2 bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CPBC</p>
            <p className={cn('text-5xl font-bold tracking-tight', cpbcColor(headerCPBC, thresholds))}>
              {headerCPBC != null ? `$${Math.round(headerCPBC)}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Costo por booking calificado
              {thresholds.usingPrice && <span className="ml-1">(obj. ${Math.round(thresholds.good)})</span>}
            </p>
          </CardContent>
        </Card>
        {/* Inversión */}
        <Card className="col-span-1 bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Inversión</p>
            <p className="text-2xl font-bold">{usd(headerInversion)}</p>
            <p className="text-xs text-muted-foreground mt-1">{latestWeek ? 'última semana' : 'período'}</p>
          </CardContent>
        </Card>
        {/* Leads */}
        <Card className="col-span-1 bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Leads</p>
            <p className="text-2xl font-bold">{n(headerLeads)}</p>
            {globalCPL != null && <p className="text-xs text-muted-foreground mt-1">CPL {usd(globalCPL)}</p>}
          </CardContent>
        </Card>
        {/* Calificados */}
        <Card className="col-span-1 bg-card border-border/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Calificados</p>
            <p className="text-2xl font-bold">{n(headerCalif)}</p>
            {headerLeads != null && headerCalif != null && headerLeads > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{pct((headerCalif / headerLeads) * 100)} de leads</p>
            )}
          </CardContent>
        </Card>
        {/* Rates */}
        <Card className="col-span-1 bg-card border-border/50">
          <CardContent className="p-5 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Show rate</p>
              <p className={cn('text-xl font-bold', rateColor(headerShowRate))}>{pct(headerShowRate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Close rate</p>
              <p className={cn('text-xl font-bold', rateColor(headerCloseRate))}>{pct(headerCloseRate)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Health banner — visible with any data source ─────────────────── */}
      <HealthBannerWidget status={healthStatus} cpbc={headerCPBC} thresholds={thresholds} />

      {/* ── Audit panel — visible with any data source ───────────────────── */}
      <AuditPanelWidget recommendations={auditResults} />

      {/* ── Timeseries chart — needs daily rows; shows placeholder if absent */}
      {daily.length > 0
        ? <TimeseriesChartWidget daily={daily} thresholds={thresholds} />
        : (
          <Card className="bg-card border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-40 gap-2 text-center">
              <BarChart2 className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin datos diarios para el período seleccionado</p>
              <p className="text-xs text-muted-foreground/60">Cambiá el rango de fechas o cargá métricas en ads_metricas_diarias</p>
            </CardContent>
          </Card>
        )
      }

      {/* ── Weekly summary table ─────────────────────────────────────────── */}
      {weekly.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Resumen semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Semana</TableHead>
                    <TableHead className="text-xs text-right">Inversión</TableHead>
                    <TableHead className="text-xs text-right">Leads</TableHead>
                    <TableHead className="text-xs text-right">CPL</TableHead>
                    <TableHead className="text-xs text-right">Calificados</TableHead>
                    <TableHead className="text-xs text-right">Bookings</TableHead>
                    <TableHead className="text-xs text-right font-semibold">CPBC</TableHead>
                    <TableHead className="text-xs text-right">Show rate</TableHead>
                    <TableHead className="text-xs text-right">Close rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekly.map((w, i) => (
                    <TableRow key={w.week_start} className={cn('text-sm', i === 0 && 'bg-primary/5')}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {fmtWeek(w.week_start, w.week_end)}
                        {i === 0 && <Badge className="ml-2 text-xs bg-primary/15 text-primary border-0">última</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{usd(w.ads_investment)}</TableCell>
                      <TableCell className="text-right">{n(w.ads_leads)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{usd(w.ads_cpl)}</TableCell>
                      <TableCell className="text-right">{n(w.ads_qualified_leads)}</TableCell>
                      <TableCell className="text-right">{n(w.ads_bookings)}</TableCell>
                      <TableCell className={cn('text-right font-semibold', cpbcColor(w.ads_cpbc, thresholds))}>{usd(w.ads_cpbc)}</TableCell>
                      <TableCell className={cn('text-right', rateColor(w.ads_show_rate))}>{pct(w.ads_show_rate)}</TableCell>
                      <TableCell className={cn('text-right', rateColor(w.ads_close_rate))}>{pct(w.ads_close_rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
