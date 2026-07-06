import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { DollarSign, ShoppingCart, Users, PlayCircle, MousePointerClick, TrendingDown, RotateCcw, AlertTriangle } from 'lucide-react';
import { startOfWeek, format } from 'date-fns';

type VslEvent = Database['public']['Tables']['vsl_events']['Row'];

// This is a separate business line from the agency's own landings tracked
// in VSL Tracking — same vsl_events table, but filtered down to just this
// offer, and everything below is specific to its own funnel/revenue shape.
const BUSINESS_LINE = 'maquina-cierres';
const LANDING_ID = 'metodo-cierre';
const TICKET_PRICE = 98;
const FORM_UTM_SOURCE = 'torii-form';

const DATE_RANGES = [
  { key: '30', label: 'Últimos 30 días', days: 30 },
  { key: '90', label: 'Últimos 90 días', days: 90 },
  { key: 'all', label: 'Todo el historial', days: null },
] as const;

interface McSessionSummary {
  hasPlay: boolean;
  hasStripeClick: boolean;
  hasWhatsappClick: boolean;
  hasPurchase: boolean;
  utmSource: string | null;
}

// One pass over the raw events, grouped by session_id — same pattern as
// VslTracking.tsx's buildSessionSummaries, but this offer's own event set
// (MC_Stripe_Click / MC_WhatsApp_Click / MC_Purchase) instead of the video
// milestones + form-submit funnel the agency's landings use.
function buildSessionSummaries(events: VslEvent[]): Map<string, McSessionSummary> {
  const map = new Map<string, McSessionSummary>();
  for (const e of events) {
    if (!e.session_id) continue;
    let s = map.get(e.session_id);
    if (!s) {
      s = { hasPlay: false, hasStripeClick: false, hasWhatsappClick: false, hasPurchase: false, utmSource: null };
      map.set(e.session_id, s);
    }
    if (e.event_name === 'VSL_Play') s.hasPlay = true;
    if (e.event_name === 'MC_Stripe_Click') s.hasStripeClick = true;
    if (e.event_name === 'MC_WhatsApp_Click') s.hasWhatsappClick = true;
    if (e.event_name === 'MC_Purchase') s.hasPurchase = true;
    if (!s.utmSource && e.utm_source) s.utmSource = e.utm_source;
  }
  return map;
}

// Refunds have no automatic event — see the "Reembolsos" card for the
// manual-entry convention (an 'MC_Refund' row inserted by hand into this
// same vsl_events table, no separate table to maintain).
function countRefundSessions(events: VslEvent[]): number {
  const ids = new Set<string>();
  for (const e of events) {
    if (e.event_name === 'MC_Refund' && e.session_id) ids.add(e.session_id);
  }
  return ids.size;
}

interface RevenueTrendPoint { period: string; compras: number; revenue: number; }

function buildRevenueTrend(events: VslEvent[], granularity: 'week' | 'month'): RevenueTrendPoint[] {
  const sessionsByBucket = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.event_name !== 'MC_Purchase' || !e.session_id || !e.created_at) continue;
    const date = new Date(e.created_at);
    const bucketKey = granularity === 'month'
      ? format(date, 'yyyy-MM')
      : format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    let set = sessionsByBucket.get(bucketKey);
    if (!set) { set = new Set(); sessionsByBucket.set(bucketKey, set); }
    set.add(e.session_id);
  }
  return Array.from(sessionsByBucket.entries())
    .map(([period, set]) => ({ period, compras: set.size, revenue: set.size * TICKET_PRICE }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function pct(num: number, den: number): string {
  return den ? `${Math.round((num / den) * 100)}%` : '—';
}

export function AnaliticasView() {
  const [events, setEvents] = useState<VslEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRangeKey, setDateRangeKey] = useState<typeof DATE_RANGES[number]['key']>('30');
  const [trendGranularity, setTrendGranularity] = useState<'week' | 'month'>('week');

  useEffect(() => { loadData(); }, [dateRangeKey]);

  async function loadData() {
    setLoading(true);
    try {
      const range = DATE_RANGES.find(r => r.key === dateRangeKey);
      let query = supabase
        .from('vsl_events')
        .select('*')
        .eq('business_line', BUSINESS_LINE)
        .eq('landing_id', LANDING_ID)
        .order('created_at', { ascending: true });
      if (range?.days != null) {
        const since = new Date();
        since.setDate(since.getDate() - range.days);
        query = query.gte('created_at', since.toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      setEvents(data ?? []);
    } catch (error) {
      console.error('Error loading Máquina de Cierres events:', error);
    } finally {
      setLoading(false);
    }
  }

  const sessions = useMemo(() => Array.from(buildSessionSummaries(events).values()), [events]);
  const revenueTrend = useMemo(() => buildRevenueTrend(events, trendGranularity), [events, trendGranularity]);
  const refundSessionCount = useMemo(() => countRefundSessions(events), [events]);

  // ── Block 1: Revenue ──
  const purchaseCount = sessions.filter(s => s.hasPurchase).length;
  const grossRevenue = purchaseCount * TICKET_PRICE;
  const totalRefunded = refundSessionCount * TICKET_PRICE;
  const netRevenue = grossRevenue - totalRefunded;

  // ── Block 2: Funnel ──
  const totalVisitors = sessions.length;
  const playCount = sessions.filter(s => s.hasPlay).length;
  const intentCount = sessions.filter(s => s.hasStripeClick || s.hasWhatsappClick).length;

  const funnelStages = [
    { key: 'visitors', label: 'Visitantes únicos', count: totalVisitors },
    { key: 'play', label: 'Dieron Play', count: playCount },
    { key: 'intent', label: 'Mostraron intención (Stripe o WhatsApp)', count: intentCount },
    { key: 'purchase', label: 'Compraron', count: purchaseCount },
  ].map((stage, i, arr) => ({
    ...stage,
    dropOffPct: i === 0 || arr[i - 1].count === 0 ? null : Math.round((1 - stage.count / arr[i - 1].count) * 100),
  }));
  const maxFunnelCount = totalVisitors;

  // ── Block 3: Stripe vs WhatsApp ──
  const stripeClickCount = sessions.filter(s => s.hasStripeClick).length;
  const whatsappClickCount = sessions.filter(s => s.hasWhatsappClick).length;
  const stripePurchaseCount = sessions.filter(s => s.hasStripeClick && s.hasPurchase).length;
  const stripeConversionRate = stripeClickCount ? Math.round((stripePurchaseCount / stripeClickCount) * 100) : 0;
  // NOT a "WhatsApp conversion rate" — WhatsApp-negotiated sales (manual
  // transfer, payment link sent by hand) never fire MC_Purchase, so this can
  // only ever measure the subset that clicked WhatsApp and THEN paid via
  // Stripe anyway. Labeled explicitly in the UI to avoid it being read as
  // "WhatsApp converts at X%".
  const whatsappThenStripeCount = sessions.filter(s => s.hasWhatsappClick && s.hasPurchase).length;

  // ── Block 4: Traffic origin (form redirect not configured yet — see disclaimer in render) ──
  const fromFormCount = sessions.filter(s => s.utmSource === FORM_UTM_SOURCE).length;
  const fromOtherCount = totalVisitors - fromFormCount;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={dateRangeKey} onValueChange={(v) => setDateRangeKey(v as typeof dateRangeKey)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Block 1: Revenue ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <DollarSign className="h-6 w-6 text-success" />
            <p className="text-2xl font-bold mt-3">${grossRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Revenue bruto</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <p className="text-2xl font-bold mt-3">{purchaseCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Compras en el período</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <RotateCcw className="h-6 w-6 text-destructive" />
            <p className="text-2xl font-bold mt-3">${totalRefunded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total reembolsado</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-success/30">
          <CardContent className="p-4">
            <DollarSign className="h-6 w-6 text-success" />
            <p className="text-2xl font-bold mt-3 text-success">${netRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Revenue neto (bruto − reembolsos)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Tendencia de revenue</CardTitle>
          <Select value={trendGranularity} onValueChange={(v) => setTrendGranularity(v as 'week' | 'month')}>
            <SelectTrigger className="w-28 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semanal</SelectItem>
              <SelectItem value="month">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} name="Revenue ($)" isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="compras" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Compras" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {revenueTrend.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">Sin compras en este período</p>
          )}
        </CardContent>
      </Card>

      {/* ── Block 2: Funnel ── */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Funnel completo
          </CardTitle>
          <CardDescription>Visitantes únicos → Dieron Play → Mostraron intención de compra → Compraron</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnelStages.map(stage => (
            <div key={stage.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{stage.count}</span>
                  {stage.dropOffPct !== null && (
                    <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                      <TrendingDown className="h-3 w-3" />-{stage.dropOffPct}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: maxFunnelCount ? `${(stage.count / maxFunnelCount) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
          {totalVisitors === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">Sin datos para este período</p>
          )}
        </CardContent>
      </Card>

      {/* ── Block 3: Stripe vs WhatsApp ── */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            Split Stripe vs WhatsApp
          </CardTitle>
          <CardDescription>Qué puerta de pago eligen, y qué tan bien convierte cada una</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-medium mb-1">Stripe</p>
              <p className="text-2xl font-bold">{stripeClickCount}</p>
              <p className="text-xs text-muted-foreground mb-3">clicks · {pct(stripeClickCount, intentCount)} de la intención total</p>
              <Badge className="bg-success/15 text-success border-0">{stripeConversionRate}% convirtió en compra</Badge>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-medium mb-1">WhatsApp</p>
              <p className="text-2xl font-bold">{whatsappClickCount}</p>
              <p className="text-xs text-muted-foreground mb-3">clicks · {pct(whatsappClickCount, intentCount)} de la intención total</p>
              <Badge variant="outline" className="text-muted-foreground border-border">No medible con el tracking actual</Badge>
            </div>
          </div>
          <div className="mt-4 rounded-md bg-secondary/30 p-3 space-y-1.5">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              No existe un evento de conversión para WhatsApp: las ventas cerradas por transferencia o link manual no disparan <code>MC_Purchase</code>, así que ese % no se puede calcular con los datos disponibles hoy.
            </p>
            <p className="text-xs text-muted-foreground">
              Dato aparte (no es una tasa de conversión de WhatsApp): de las <strong>{whatsappClickCount}</strong> sesiones que clickearon WhatsApp, <strong>{whatsappThenStripeCount}</strong> igual terminaron pagando por Stripe.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Block 4: Traffic origin ── */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            Procedencia del tráfico
          </CardTitle>
          <CardDescription>Formulario principal (no calificó) vs. otras fuentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-md bg-warning/10 border border-warning/30 p-3">
            <p className="text-xs text-warning flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Esta landing todavía no recibe el UTM que la identifica como viniendo del formulario que descalificó al lead. Hace falta configurar ese redirect (probablemente un workflow de GHL) para que use
                {' '}<code>?utm_source=torii-form&utm_medium=downsell&utm_campaign=no-califico</code>. Los datos de antes de esa configuración van a aparecer como "otras fuentes" — eso NO significa que el formulario generó cero tráfico, significa que el tráfico no está etiquetado todavía.
              </span>
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead className="text-center">Visitantes</TableHead>
                <TableHead className="text-center">% del total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Formulario principal (utm_source=torii-form)</TableCell>
                <TableCell className="text-center">{fromFormCount}</TableCell>
                <TableCell className="text-center">{pct(fromFormCount, totalVisitors)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Otras fuentes / sin etiquetar</TableCell>
                <TableCell className="text-center">{fromOtherCount}</TableCell>
                <TableCell className="text-center">{pct(fromOtherCount, totalVisitors)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Block 5: Refunds ── */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-destructive" />
            Reembolsos
          </CardTitle>
          <CardDescription>Sin webhook de Stripe — carga manual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-2xl font-bold">{refundSessionCount}</p>
              <p className="text-xs text-muted-foreground">Reembolsos registrados</p>
            </div>
            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-2xl font-bold text-destructive">${totalRefunded.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total reembolsado</p>
            </div>
          </div>
          <div className="rounded-md bg-secondary/30 p-3">
            <p className="text-xs font-medium mb-1">Cómo registrar un reembolso</p>
            <p className="text-xs text-muted-foreground">
              No hay webhook de Stripe a Supabase para reembolsos todavía, así que se cargan a mano: en el Table Editor de Supabase, insertá una fila en <code>vsl_events</code> con
              {' '}<code>business_line = 'maquina-cierres'</code>, <code>landing_id = 'metodo-cierre'</code>, <code>event_name = 'MC_Refund'</code> y el mismo <code>session_id</code> de la compra original (o cualquier session_id nuevo si no lo tenés a mano — solo se usa para contar, no se cruza con la compra puntual).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
