import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart, Area, Line, BarChart, Bar, AreaChart, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, Users, Target, Handshake, TrendingUp,
  CalendarDays, PlayCircle, AlertTriangle,
} from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { HEALTH_CONFIG, cpbcSemaphoreClass, computeHealth, safeDiv } from '../lib/clientHealth';
import { KpiCardWithTrend } from './shared/KpiCardWithTrend';
import { DonutMetricGauge } from './shared/DonutMetricGauge';
import { TopCampaignsTable } from './shared/TopCampaignsTable';
import { PhaseTimeline } from '@/components/clientes/torii-os/PhaseTimeline';
import { fetchClientPhases, fetchChecklist, nextPhaseOf } from '@/features/delivery-os/lib/phasesRepo';
import { PHASE_LABELS, PHASE_DEFAULT_DAYS } from '@/features/delivery-os/types';
import type { DeliveryPhase, PhaseChecklistItem } from '@/features/delivery-os/types';
import type { ClientDetailData } from '../types';

const COLORS = { inversion: '#e5182b', leads: '#3b82f6', reuniones: '#10b981', cierres: '#f59e0b', revenue: '#8b5cf6' };

function fmtMoney(v: number | null): string {
  return v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}
function last7<T>(arr: T[]): T[] {
  return arr.slice(-7);
}

interface ClientViewProps {
  data: ClientDetailData;
}

export function ClientView({ data }: ClientViewProps) {
  const { client, ads, closing, revenue, cpbc, prevPeriod, dailySeries, periodTrend, cpbcHistory, revenueHistory, topCampaigns, vsl, diasActivo } = data;
  const health = computeHealth(revenue);
  const healthCfg = HEALTH_CONFIG[health];

  const [currentPhase, setCurrentPhase] = useState<DeliveryPhase | null>(null);
  const [phaseHistory, setPhaseHistory] = useState<DeliveryPhase[]>([]);
  const [checklistItems, setChecklistItems] = useState<PhaseChecklistItem[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingPhases(true);
    fetchClientPhases(client.id)
      .then(async ({ current, history }) => {
        if (cancelled) return;
        setCurrentPhase(current);
        setPhaseHistory(history);
        setChecklistItems(current ? await fetchChecklist(client.id, current.fase) : []);
      })
      .catch((err) => console.error('[ClientView] failed to load Torii OS phases:', err))
      .finally(() => { if (!cancelled) setLoadingPhases(false); });
    return () => { cancelled = true; };
  }, [client.id]);

  const daysInPhase = currentPhase ? differenceInCalendarDays(new Date(), parseISO(currentPhase.fecha_inicio)) : null;
  const objetivo = currentPhase ? (currentPhase.tiempo_objetivo_dias ?? PHASE_DEFAULT_DAYS[currentPhase.fase]) : null;
  const phaseRatio = daysInPhase != null && objetivo ? daysInPhase / objetivo : null;
  const phaseSemaphoreClass = phaseRatio == null ? 'text-muted-foreground' : phaseRatio > 1 ? 'text-destructive' : phaseRatio >= 0.8 ? 'text-warning' : 'text-success';
  const checklistDone = checklistItems.filter((i) => i.completada).length;
  const nextPhase = currentPhase ? nextPhaseOf(currentPhase.fase) : null;

  const cpblSeries = last7(dailySeries).map((d) => safeDiv(d.inversion, d.leads) ?? 0);
  const cpbcSeries = last7(dailySeries).map((d) => safeDiv(d.inversion, d.reuniones) ?? 0);
  const prevCpl = prevPeriod ? prevPeriod.ads.cpl : null;
  const prevCpbc = prevPeriod ? safeDiv(prevPeriod.ads.inversion, prevPeriod.closing.reuniones) : null;

  const kpis = [
    { label: 'Inversión del mes', value: fmtMoney(ads.inversion), icon: DollarSign, sparklineData: last7(dailySeries).map((d) => d.inversion), sparklineColor: COLORS.inversion, prevValue: prevPeriod?.ads.inversion, currentValue: ads.inversion },
    { label: 'Leads', value: ads.leads.toLocaleString(), icon: Users, sparklineData: last7(dailySeries).map((d) => d.leads), sparklineColor: COLORS.leads, prevValue: prevPeriod?.ads.leads, currentValue: ads.leads },
    { label: 'CPL', value: fmtMoney(ads.cpl), icon: DollarSign, sparklineData: cpblSeries, sparklineColor: COLORS.inversion, prevValue: prevCpl, currentValue: ads.cpl, higherIsBetter: false },
    { label: 'Reuniones agendadas', value: closing.reuniones.toLocaleString(), icon: Handshake, sparklineData: last7(dailySeries).map((d) => d.reuniones), sparklineColor: COLORS.reuniones, prevValue: prevPeriod?.closing.reuniones, currentValue: closing.reuniones },
    { label: 'CPBC', value: fmtMoney(cpbc), icon: Target, valueClassName: cpbcSemaphoreClass(cpbc, client.country), sparklineData: cpbcSeries, sparklineColor: COLORS.inversion, prevValue: prevCpbc, currentValue: cpbc, higherIsBetter: false },
    { label: 'Show rate', value: fmtPct(closing.showRate), icon: Users, prevValue: prevPeriod ? safeDiv(prevPeriod.closing.asistieron, prevPeriod.closing.reuniones) : null, currentValue: closing.showRate },
    { label: 'Calificados', value: closing.calificados.toLocaleString(), icon: Users, prevValue: prevPeriod?.closing.calificados, currentValue: closing.calificados },
    { label: 'Cierres', value: closing.cierres.toLocaleString(), icon: Handshake, sparklineData: last7(dailySeries).map((d) => d.cierres), sparklineColor: COLORS.cierres, prevValue: prevPeriod?.closing.cierres, currentValue: closing.cierres },
    { label: 'CAC', value: revenue.hasData ? fmtMoney(revenue.cac) : 'Sin datos', icon: DollarSign, valueClassName: revenue.cac != null && revenue.cac > 0 ? 'text-success' : undefined },
    { label: 'Revenue', value: revenue.hasData ? fmtMoney(revenue.revenue) : 'Sin datos', icon: DollarSign, valueClassName: revenue.revenue != null && revenue.revenue > 0 ? 'text-success' : undefined },
    { label: 'ROI', value: revenue.roi != null ? `${revenue.roi.toFixed(1)}x` : 'Sin datos', icon: TrendingUp, valueClassName: revenue.roi != null && revenue.roi > 0 ? 'text-success' : undefined },
    { label: 'Días activo', value: diasActivo != null ? diasActivo.toLocaleString() : '—', icon: CalendarDays },
  ];

  const funnelStages = [
    { key: 'leads', label: 'Leads', count: ads.leads, color: COLORS.leads },
    { key: 'reuniones', label: 'Reuniones', count: closing.reuniones, color: COLORS.reuniones },
    { key: 'calificados', label: 'Calificados', count: closing.calificados, color: COLORS.cierres },
    { key: 'cierres', label: 'Cierres', count: closing.cierres, color: COLORS.inversion },
  ].map((s, i, arr) => ({ ...s, rate: i === 0 || arr[i - 1].count === 0 ? null : Math.round((s.count / arr[i - 1].count) * 100) }));
  const maxFunnel = ads.leads || 1;

  const tasaCalificacion = safeDiv(closing.calificados, closing.reuniones);

  return (
    <div className="space-y-6">
      {loadingPhases ? (
        <div className="h-28 rounded-lg bg-secondary/40 animate-pulse" />
      ) : !currentPhase ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Torii OS no iniciado para este cliente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-2 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Torii OS · Fase de Delivery</CardTitle>
            </CardHeader>
            <CardContent className="pt-1 overflow-x-auto">
              <PhaseTimeline current={currentPhase} history={phaseHistory} onSelectHistoryPhase={() => {}} compact />
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{PHASE_LABELS[currentPhase.fase]}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className={cn('text-lg font-bold', phaseSemaphoreClass)}>{daysInPhase}<span className="text-muted-foreground text-xs font-normal"> / {objetivo}d</span></p>
                <p className="text-xs text-muted-foreground">Días en fase</p>
              </div>
              <div>
                <p className="text-lg font-bold">{checklistDone}/{checklistItems.length}</p>
                <p className="text-xs text-muted-foreground">Checklist</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium">{nextPhase ? PHASE_LABELS[nextPhase] : 'Última fase'}</p>
                <p className="text-xs text-muted-foreground">Próxima fase</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <KpiCardWithTrend
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            valueClassName={k.valueClassName}
            sparklineData={k.sparklineData}
            sparklineColor={k.sparklineColor}
            prevValue={k.prevValue ?? null}
            currentValue={k.currentValue ?? null}
            higherIsBetter={k.higherIsBetter}
          />
        ))}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Embudo completo</CardTitle>
          <CardDescription>Leads → Reuniones → Calificados → Cierres</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnelStages.map((stage) => (
            <div key={stage.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stage.count}</span>
                  {stage.rate !== null && <Badge variant="outline" className="text-xs">{stage.rate}%</Badge>}
                </div>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(stage.count / maxFunnel) * 100}%`, background: stage.color }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Distribución de conversión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-around gap-6">
          <DonutMetricGauge label="Show rate" value={closing.showRate} goodThreshold={0.6} okThreshold={0.4} />
          <DonutMetricGauge label="Tasa de calificación" value={tasaCalificacion} goodThreshold={0.6} okThreshold={0.4} />
          <DonutMetricGauge label="Tasa de cierre" value={closing.closeRate} goodThreshold={0.6} okThreshold={0.4} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base font-medium">Inversión, leads y reuniones</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={periodTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="left" type="monotone" dataKey="inversion" name="Inversión ($)" stroke={COLORS.inversion} fill={COLORS.inversion} fillOpacity={0.25} stackId="a" isAnimationActive={false} />
                  <Area yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke={COLORS.leads} fill={COLORS.leads} fillOpacity={0.25} stackId="b" isAnimationActive={false} />
                  <Area yAxisId="right" type="monotone" dataKey="reuniones" name="Reuniones" stroke={COLORS.reuniones} fill={COLORS.reuniones} fillOpacity={0.25} stackId="b" isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="cierres" name="Cierres" stroke={COLORS.cierres} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {periodTrend.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Sin datos para este período</p>}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base font-medium">Timeline de actividad</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries.map((d) => ({ ...d, label: d.fecha.slice(5) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="reuniones" name="Agendas" fill={COLORS.leads} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cierres" name="Cierres" fill={COLORS.inversion} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base font-medium">CPBC histórico (6 meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cpbcHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="cpbc" name="CPBC" stroke={COLORS.cierres} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Revenue acumulado</CardTitle>
            <CardDescription>Sin fuente confiable de revenue por cliente todavía</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueHistory.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Sin datos</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                    <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="acumulado" stroke={COLORS.revenue} fill={COLORS.revenue} fillOpacity={0.2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base font-medium">Meta Ads del período</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-bold">{ads.ctr != null ? `${ads.ctr.toFixed(2)}%` : '—'}</p><p className="text-xs text-muted-foreground">CTR prom.</p></div>
              <div><p className="text-lg font-bold">{fmtMoney(ads.cpm)}</p><p className="text-xs text-muted-foreground">CPM prom.</p></div>
              <div><p className="text-lg font-bold">{fmtMoney(ads.cpc)}</p><p className="text-xs text-muted-foreground">CPC prom.</p></div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Top 3 campañas por leads</p>
              <TopCampaignsTable campaigns={topCampaigns} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base font-medium">Closing del período</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Motivos de no cierre</p>
              <div className="space-y-1.5">
                {closing.lossReasons.map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm bg-secondary/30 rounded-md px-3 py-2">
                    <span>{r.reason}</span>
                    <Badge className="bg-secondary text-foreground border-0">{r.count}</Badge>
                  </div>
                ))}
                {closing.lossReasons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Performance por closer</p>
              <div className="space-y-1.5">
                {closing.byCloser.map((c) => (
                  <div key={c.closer} className="flex items-center justify-between text-sm bg-secondary/30 rounded-md px-3 py-2">
                    <span>{c.closer}</span>
                    <span className="text-muted-foreground">{c.cierres}/{c.reuniones} ({c.reuniones ? Math.round((c.cierres / c.reuniones) * 100) : 0}%)</span>
                  </div>
                ))}
                {closing.byCloser.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {vsl && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              VSL del cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div><p className="text-lg font-bold">{vsl.visitantesUnicos}</p><p className="text-xs text-muted-foreground">Visitantes únicos</p></div>
            <div><p className="text-lg font-bold">{fmtPct(vsl.playRate)}</p><p className="text-xs text-muted-foreground">Play rate</p></div>
            <div><p className="text-lg font-bold">{vsl.abandonoPromedio != null ? `${Math.round(vsl.abandonoPromedio)}%` : '—'}</p><p className="text-xs text-muted-foreground">Abandono promedio</p></div>
            <div><p className="text-lg font-bold">{fmtPct(vsl.conversionBooking)}</p><p className="text-xs text-muted-foreground">Conversión a booking</p></div>
          </CardContent>
        </Card>
      )}

      <Card className={`bg-card ${healthCfg.borderClass}`}>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            Estado del cliente
            <Badge className={healthCfg.badgeClass}>{healthCfg.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-sm font-medium">{client.fase ?? '—'}</p><p className="text-xs text-muted-foreground">Fase Delivery OS</p></div>
          <div><p className="text-sm font-medium">{client.days_in_phase ?? '—'}</p><p className="text-xs text-muted-foreground">Días en fase</p></div>
          <div className="flex items-center gap-1.5">
            {client.renewal_risk && client.renewal_risk.toLowerCase() !== 'bajo' && <AlertTriangle className="h-4 w-4 text-warning" />}
            <div><p className="text-sm font-medium">{client.renewal_risk ?? '—'}</p><p className="text-xs text-muted-foreground">Renewal risk</p></div>
          </div>
          <div><p className="text-sm font-medium">{fmtMoney(client.mrr)}</p><p className="text-xs text-muted-foreground">MRR del cliente</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
