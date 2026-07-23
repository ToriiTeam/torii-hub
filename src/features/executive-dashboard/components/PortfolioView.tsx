import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, Handshake, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { HEALTH_CONFIG, cpbcSemaphoreClass, cpbcTargetFor } from '../lib/clientHealth';
import { MetricInfo, type MetricInfoProps } from './shared/MetricInfo';
import type { PortfolioClientRow, PortfolioData } from '../types';

function fmtMoney(v: number | null): string {
  return v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}
function fmtN(v: number): string {
  return v.toLocaleString();
}

// These KPIs are about each client account's OWN ads/closing/revenue
// (owner_type='client'), unrelated to Torii's own funnel — the "Nuevo
// Torii" toggle (which only scopes Torii's own money/funnel cards, see
// ToriiView.tsx) doesn't touch this view at all, whether embedded there or
// shown standalone as "Todos los clientes". Always just the selected period.
const SCOPE_LABEL = 'Sin filtro adicional — usa el período seleccionado arriba';

type SortKey = 'name' | 'inversion' | 'leads' | 'cpl' | 'reuniones' | 'showRate' | 'calificados' | 'cierres' | 'closeRate' | 'revenue' | 'cpbc' | 'cac' | 'roi';

function sortValue(row: PortfolioClientRow, key: SortKey): number | string {
  switch (key) {
    case 'name': return row.client.name;
    case 'inversion': return row.ads.inversion;
    case 'leads': return row.ads.leads;
    case 'cpl': return row.ads.cpl ?? -1;
    case 'reuniones': return row.closing.reuniones;
    case 'showRate': return row.closing.showRate ?? -1;
    case 'calificados': return row.closing.calificados;
    case 'cierres': return row.closing.cierres;
    case 'closeRate': return row.closing.closeRate ?? -1;
    case 'revenue': return row.revenue.revenue ?? -1;
    case 'cpbc': return row.cpbc ?? -1;
    case 'cac': return row.revenue.cac ?? -1;
    case 'roi': return row.revenue.roi ?? -1;
  }
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Cliente' },
  { key: 'inversion', label: 'Inversión' },
  { key: 'leads', label: 'Leads' },
  { key: 'cpl', label: 'CPL' },
  { key: 'reuniones', label: 'Reuniones' },
  { key: 'showRate', label: 'Show%' },
  { key: 'calificados', label: 'Calificados' },
  { key: 'cierres', label: 'Cierres' },
  { key: 'closeRate', label: 'Close%' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'cpbc', label: 'CPBC' },
  { key: 'cac', label: 'CAC' },
  { key: 'roi', label: 'ROI' },
];

const CHART_COLORS = ['#e5182b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

interface PortfolioViewProps {
  data: PortfolioData;
  // False when this view is re-embedded inside ToriiView's "Resumen del
  // portfolio" section — that page already shows Torii's own revenue in
  // its own KPI row above, so repeating it here would just be the same
  // number twice. Defaults to true for this component's standalone use as
  // the "Todos los clientes" top-level view.
  showToriiRevenue?: boolean;
}

export function PortfolioView({ data, showToriiRevenue = true }: PortfolioViewProps) {
  const { rows, totalMrr, monthlyClosesTrend } = data;
  const [sortKey, setSortKey] = useState<SortKey>('inversion');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  // Collapsed by default — a 14-column table for every client is a lot to
  // land on immediately; the KPI row and charts already carry the summary.
  const [showComparison, setShowComparison] = useState(false);

  const totalInversion = rows.reduce((s, r) => s + r.ads.inversion, 0);
  const totalLeads = rows.reduce((s, r) => s + r.ads.leads, 0);
  const totalReuniones = rows.reduce((s, r) => s + r.closing.reuniones, 0);
  const totalCierres = rows.reduce((s, r) => s + r.closing.cierres, 0);
  // Pooled across the portfolio: sum numerators and denominators
  // separately, then divide once — NOT an average of each client's own
  // ratio, which would let a low-volume client's ratio weigh the same as
  // a high-volume one. Same fix already applied to content_metrics_tanda.
  const totalRevenue = rows.reduce((s, r) => s + (r.revenue.revenue ?? 0), 0);
  const avgCpbc = totalReuniones ? totalInversion / totalReuniones : null;
  const avgRoi = totalInversion ? totalRevenue / totalInversion : null;

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const invRevData = rows.map((r) => ({ name: r.client.name, Inversión: r.ads.inversion, Revenue: r.revenue.revenue ?? 0 }));
  const cpbcData = rows.map((r) => ({ name: r.client.name, cpbc: r.cpbc ?? 0, target: cpbcTargetFor(r.client.country) }));
  const avgTarget = rows.length ? rows.reduce((s, r) => s + cpbcTargetFor(r.client.country), 0) / rows.length : 30;

  const kpis: { label: string; value: string; icon: typeof DollarSign; sub: string | null; className?: string; info: MetricInfoProps }[] = [
    ...(showToriiRevenue
      ? [{
          label: 'Revenue de Torii', value: fmtMoney(totalMrr), icon: DollarSign,
          sub: 'ventas propias, closer calls', className: totalMrr > 0 ? 'text-success' : undefined,
          info: {
            formula: "Suma de client_closer_calls.precio donde owner_type='torii' y cerro=true, dentro del rango de fecha aplicado.",
            source: 'client_closer_calls',
            scopeLabel: SCOPE_LABEL,
          },
        }]
      : []),
    {
      label: 'Inversión en ads (Portfolio)', value: fmtMoney(totalInversion), icon: TrendingUp, sub: null,
      info: {
        formula: 'Suma de ads.inversion de cada cliente de cartera (ads_metricas_diarias con ads_campanas.client_id no nulo), dentro del rango de fecha aplicado.',
        source: 'ads_metricas_diarias + ads_campanas',
        scopeLabel: SCOPE_LABEL,
      },
    },
    {
      label: 'Leads generados', value: fmtN(totalLeads), icon: Users, sub: null,
      info: {
        formula: 'Suma de ads.leads de cada cliente de cartera, dentro del rango de fecha aplicado.',
        source: 'ads_metricas_diarias + ads_campanas',
        scopeLabel: SCOPE_LABEL,
      },
    },
    {
      label: 'Reuniones agendadas', value: fmtN(totalReuniones), icon: Handshake, sub: null,
      info: {
        formula: "Suma de reuniones por cliente: filas de client_closer_calls donde owner_type='client' (el funnel de CADA cliente, no el propio de Torii), dentro del rango de fecha aplicado.",
        source: 'client_closer_calls',
        scopeLabel: SCOPE_LABEL,
      },
    },
    {
      label: 'Cierres (Portfolio)', value: fmtN(totalCierres), icon: Handshake, sub: null,
      info: {
        formula: "Suma de cierres por cliente: filas de client_closer_calls donde owner_type='client' y cerro=true, dentro del rango de fecha aplicado.",
        source: 'client_closer_calls',
        scopeLabel: SCOPE_LABEL,
      },
    },
    {
      label: 'CPBC promedio', value: fmtMoney(avgCpbc), icon: Target, sub: null,
      info: {
        formula: 'Inversión total del portfolio / Reuniones totales del portfolio (pooled: suma/suma, no promedio de cada cliente).',
        source: 'ads_metricas_diarias + client_closer_calls',
        scopeLabel: SCOPE_LABEL,
        breakdown: [
          { label: 'Inversión total', value: fmtMoney(totalInversion) },
          { label: 'Reuniones totales', value: fmtN(totalReuniones) },
        ],
      },
    },
    {
      label: 'ROI promedio', value: avgRoi != null ? `${avgRoi.toFixed(1)}x` : 'Sin datos', icon: TrendingUp, sub: null,
      className: avgRoi != null && avgRoi > 0 ? 'text-success' : undefined,
      info: {
        formula: 'Revenue total del portfolio / Inversión total del portfolio (pooled: suma/suma). Revenue = comisión de Torii (comision_estimada, o precio si no está cargada) en client_closer_calls con cerro=true.',
        source: 'client_closer_calls + ads_metricas_diarias',
        scopeLabel: SCOPE_LABEL,
        breakdown: [
          { label: 'Revenue total', value: fmtMoney(totalRevenue) },
          { label: 'Inversión total', value: fmtMoney(totalInversion) },
        ],
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="bg-card border-border/50">
              <CardContent className="p-4 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className={`text-lg font-bold ${k.className ?? ''}`}>{k.value}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <MetricInfo {...k.info} />
                </div>
                {k.sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{k.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Comparativa de clientes</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowComparison((v) => !v)}>
            {showComparison ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showComparison ? 'Ocultar comparativa' : 'Mostrar comparativa'}
          </Button>
        </CardHeader>
        {showComparison && (
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>País</TableHead>
                {COLUMNS.map((c) => (
                  <TableHead key={c.key} className="cursor-pointer select-none" onClick={() => handleSort(c.key)}>
                    {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.client.id}>
                  <TableCell className="text-sm text-muted-foreground">{row.client.country ?? '—'}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{row.client.name}</TableCell>
                  <TableCell>{fmtMoney(row.ads.inversion)}</TableCell>
                  <TableCell>{row.ads.leads}</TableCell>
                  <TableCell>{fmtMoney(row.ads.cpl)}</TableCell>
                  <TableCell>{row.closing.reuniones}</TableCell>
                  <TableCell>{fmtPct(row.closing.showRate)}</TableCell>
                  <TableCell>{row.closing.calificados}</TableCell>
                  <TableCell>{row.closing.cierres}</TableCell>
                  <TableCell>{fmtPct(row.closing.closeRate)}</TableCell>
                  <TableCell className={row.revenue.revenue != null && row.revenue.revenue > 0 ? 'text-success' : undefined}>{row.revenue.hasData ? fmtMoney(row.revenue.revenue) : <span className="text-muted-foreground text-xs">Sin datos</span>}</TableCell>
                  <TableCell className={cpbcSemaphoreClass(row.cpbc, row.client.country)}>{fmtMoney(row.cpbc)}</TableCell>
                  <TableCell className={row.revenue.cac != null && row.revenue.cac > 0 ? 'text-success' : undefined}>{row.revenue.hasData ? fmtMoney(row.revenue.cac) : <span className="text-muted-foreground text-xs">Sin datos</span>}</TableCell>
                  <TableCell>
                    {row.revenue.roi != null
                      ? <span className={row.revenue.roi > 3 ? 'text-success' : row.revenue.roi >= 1 ? 'text-warning' : 'text-destructive'}>{row.revenue.roi.toFixed(1)}x</span>
                      : <span className="text-muted-foreground text-xs">Sin datos</span>}
                  </TableCell>
                </TableRow>
              ))}
              {sortedRows.length === 0 && (
                <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">Sin clientes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Inversión vs Revenue por cliente</CardTitle>
            <CardDescription>Revenue = comisión de Torii en client_closer_calls (cerró=true)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invRevData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Inversión" fill="#e5182b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">CPBC por cliente</CardTitle>
            <CardDescription>Línea punteada: objetivo ($30 LATAM / $60 España)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cpbcData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <ReferenceLine y={avgTarget} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="cpbc" name="CPBC" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Tendencia de cierres por cliente (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyClosesTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {rows.map((r, i) => (
                  <Line key={r.client.id} type="monotone" dataKey={r.client.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Health score del portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {rows.map((row) => {
              const cfg = HEALTH_CONFIG[row.health];
              return (
                <div key={row.client.id} className={`rounded-lg border p-3 ${cfg.borderClass}`}>
                  <p className="font-medium text-sm truncate">{row.client.name}</p>
                  <Badge className={`${cfg.badgeClass} mt-2`}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
