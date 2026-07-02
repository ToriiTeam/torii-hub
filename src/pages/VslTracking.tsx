import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { PlayCircle, MousePointerClick, TrendingDown, Users, CheckCircle2 } from 'lucide-react';
import { startOfWeek, format } from 'date-fns';

type VslEvent = Database['public']['Tables']['vsl_events']['Row'];

const ALL_LANDINGS = 'all';
const ALL_CAMPAIGNS = 'all';

// Video progress milestones, in order. Each is a distinct event_name that
// Torii's VSL tracking script fires at most once per session_id.
const VIDEO_MILESTONES = [
  { key: 'play', label: 'Play', eventName: 'VSL_Play' },
  { key: 'p25', label: '25%', eventName: 'VSL_Progress_25' },
  { key: 'p50', label: '50%', eventName: 'VSL_Progress_50' },
  { key: 'p75', label: '75%', eventName: 'VSL_Progress_75' },
  { key: 'p100', label: '100%', eventName: 'VSL_Progress_100' },
] as const;

// The full funnel extends video progress with the two conversion steps:
// clicking a CTA, then actually completing the booking form (fired from the
// thank-you page — the real conversion signal, more reliable than the click).
const FUNNEL_STAGES: { key: string; label: string; matches: (s: SessionSummary) => boolean }[] = [
  ...VIDEO_MILESTONES.map(m => ({
    key: m.key,
    label: m.label,
    matches: (s: SessionSummary) => s.milestones.has(m.eventName),
  })),
  { key: 'cta', label: 'CTA Click', matches: (s: SessionSummary) => s.ctaClicks.length > 0 },
  { key: 'submit', label: 'Form Submit', matches: (s: SessionSummary) => s.hasFormSubmit },
];

const PERCENT_BUCKETS = [
  { key: 'lt25', label: '< 25%', test: (p: number) => p < 25 },
  { key: '25-50', label: '25% – 50%', test: (p: number) => p >= 25 && p < 50 },
  { key: '50-75', label: '50% – 75%', test: (p: number) => p >= 50 && p < 75 },
  { key: 'gte75', label: '75%+', test: (p: number) => p >= 75 },
] as const;

const DATE_RANGES = [
  { key: '7', label: 'Últimos 7 días', days: 7 },
  { key: '30', label: 'Últimos 30 días', days: 30 },
  { key: '90', label: 'Últimos 90 días', days: 90 },
  { key: 'all', label: 'Todo el historial', days: null },
] as const;

// percent=0 used to be saved as NULL (0 is falsy in the old tracking script).
// Treat every NULL percent as 0 rather than dropping it, since there's no way
// to tell a real NULL apart from a pre-fix zero.
function pct(value: number | null): number {
  return value ?? 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

interface SessionSummary {
  landingId: string;
  utmCampaign: string | null;
  milestones: Set<string>;
  ctaClicks: number[]; // percent-at-click for every VSL_CTA_Click this session fired
  hasFormSubmit: boolean;
  formSubmitPercent: number | null; // percent watched at the moment of the (first) submit
  lastAbandonPercent: number | null;
}

// Groups raw events by session_id. A session can appear multiple times across
// event types, so this is the one pass every other view is derived from.
function buildSessionSummaries(events: VslEvent[]): Map<string, SessionSummary> {
  const map = new Map<string, SessionSummary>();
  const milestoneNames = new Set<string>(VIDEO_MILESTONES.map(m => m.eventName));
  const lastAbandonAt = new Map<string, string>();

  for (const e of events) {
    if (!e.session_id) continue;
    let s = map.get(e.session_id);
    if (!s) {
      s = {
        landingId: e.landing_id ?? 'desconocida',
        utmCampaign: e.utm_campaign,
        milestones: new Set(),
        ctaClicks: [],
        hasFormSubmit: false,
        formSubmitPercent: null,
        lastAbandonPercent: null,
      };
      map.set(e.session_id, s);
    }

    if (milestoneNames.has(e.event_name)) s.milestones.add(e.event_name);
    if (e.event_name === 'VSL_CTA_Click') s.ctaClicks.push(pct(e.percent));

    if (e.event_name === 'VSL_Form_Submit') {
      // Should only fire once per session from the thank-you page, but keep
      // the first one if it somehow fires more than once.
      if (!s.hasFormSubmit) s.formSubmitPercent = pct(e.percent);
      s.hasFormSubmit = true;
    }

    // VSL_Abandon fires on every tab switch, not just the final one — keep
    // only the most recent one per session as the "real" abandon point.
    if (e.event_name === 'VSL_Abandon') {
      const at = e.created_at ?? '';
      const prevAt = lastAbandonAt.get(e.session_id) ?? '';
      if (at >= prevAt) {
        lastAbandonAt.set(e.session_id, at);
        s.lastAbandonPercent = pct(e.percent);
      }
    }
  }
  return map;
}

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  dropOffPct: number | null; // vs previous stage
}

function buildFunnel(sessions: SessionSummary[]): FunnelStage[] {
  const counts = FUNNEL_STAGES.map(stage => ({
    key: stage.key,
    label: stage.label,
    count: sessions.filter(stage.matches).length,
  }));
  return counts.map((stage, i) => ({
    ...stage,
    dropOffPct: i === 0 || counts[i - 1].count === 0
      ? null
      : round1((1 - stage.count / counts[i - 1].count) * 100),
  }));
}

interface PercentBucketResult {
  key: string;
  label: string;
  count: number;
  pctOfTotal: number; // this bucket's share of all values (clicks, or submits)
  conversionRate: number; // sessions with a value in this bucket / total sessions
}

// Shared by "CTA clicks by % watched" and "Form submits by % watched" —
// `getValues` picks which per-session numbers (percents) to bucket.
function buildPercentBreakdown(
  sessions: SessionSummary[],
  getValues: (s: SessionSummary) => number[],
): PercentBucketResult[] {
  const totalSessions = sessions.length;
  const allValues = sessions.flatMap(getValues);

  return PERCENT_BUCKETS.map(bucket => {
    const valuesInBucket = allValues.filter(bucket.test);
    const sessionsInBucket = sessions.filter(s => getValues(s).some(bucket.test)).length;
    return {
      key: bucket.key,
      label: bucket.label,
      count: valuesInBucket.length,
      pctOfTotal: allValues.length ? round1((valuesInBucket.length / allValues.length) * 100) : 0,
      conversionRate: totalSessions ? round1((sessionsInBucket / totalSessions) * 100) : 0,
    };
  });
}

interface TrendPoint {
  date: string;
  plays: number;
  completions: number;
  ctaClicks: number;
}

// Groups by day or by week (Monday-start). Plays/completions are raw event
// counts, which is equivalent to session counts here since the tracking
// script fires each milestone at most once per session.
function buildTrend(events: VslEvent[], granularity: 'day' | 'week'): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const e of events) {
    if (!e.created_at) continue;
    const date = new Date(e.created_at);
    const bucketKey = granularity === 'week'
      ? format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : e.created_at.slice(0, 10);

    let point = map.get(bucketKey);
    if (!point) {
      point = { date: bucketKey, plays: 0, completions: 0, ctaClicks: 0 };
      map.set(bucketKey, point);
    }
    if (e.event_name === 'VSL_Play') point.plays++;
    // Uses the same "100%" definition as the funnel (VSL_Progress_100), not
    // VSL_Complete, so the trend line and the funnel's last stage agree.
    if (e.event_name === 'VSL_Progress_100') point.completions++;
    if (e.event_name === 'VSL_CTA_Click') point.ctaClicks++;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

interface LandingSummary {
  landingId: string;
  sessions: number;
  completions: number;
  ctaClicks: number;
}

function buildLandingSummary(events: VslEvent[]): LandingSummary[] {
  const bySessions = buildSessionSummaries(events);
  const byLanding = new Map<string, LandingSummary>();
  for (const s of bySessions.values()) {
    let row = byLanding.get(s.landingId);
    if (!row) {
      row = { landingId: s.landingId, sessions: 0, completions: 0, ctaClicks: 0 };
      byLanding.set(s.landingId, row);
    }
    row.sessions++;
    if (s.milestones.has('VSL_Progress_100')) row.completions++;
    row.ctaClicks += s.ctaClicks.length;
  }
  return Array.from(byLanding.values()).sort((a, b) => b.sessions - a.sessions);
}

export default function VslTracking() {
  const [events, setEvents] = useState<VslEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRangeKey, setDateRangeKey] = useState<typeof DATE_RANGES[number]['key']>('30');
  const [landingId, setLandingId] = useState(ALL_LANDINGS);
  const [utmCampaign, setUtmCampaign] = useState(ALL_CAMPAIGNS);
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week'>('day');

  useEffect(() => {
    loadData();
  }, [dateRangeKey]);

  async function loadData() {
    setLoading(true);
    try {
      const range = DATE_RANGES.find(r => r.key === dateRangeKey);
      let query = supabase
        .from('vsl_events')
        .select('*')
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
      console.error('Error loading VSL events:', error);
    } finally {
      setLoading(false);
    }
  }

  // Only the date range triggers a refetch — landing/campaign filters and
  // the trend granularity toggle all operate on the already-loaded window.
  const landingOptions = useMemo(
    () => Array.from(new Set(events.map(e => e.landing_id).filter((v): v is string => !!v))).sort(),
    [events],
  );

  const campaignOptions = useMemo(() => {
    const scoped = landingId === ALL_LANDINGS ? events : events.filter(e => e.landing_id === landingId);
    return Array.from(new Set(scoped.map(e => e.utm_campaign).filter((v): v is string => !!v))).sort();
  }, [events, landingId]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (landingId !== ALL_LANDINGS && e.landing_id !== landingId) return false;
      if (utmCampaign !== ALL_CAMPAIGNS && e.utm_campaign !== utmCampaign) return false;
      return true;
    });
  }, [events, landingId, utmCampaign]);

  const sessionSummaries = useMemo(
    () => Array.from(buildSessionSummaries(filteredEvents).values()),
    [filteredEvents],
  );

  const funnel = useMemo(() => buildFunnel(sessionSummaries), [sessionSummaries]);
  const ctaBreakdown = useMemo(
    () => buildPercentBreakdown(sessionSummaries, s => s.ctaClicks),
    [sessionSummaries],
  );
  const submitBreakdown = useMemo(
    () => buildPercentBreakdown(sessionSummaries, s => (s.formSubmitPercent !== null ? [s.formSubmitPercent] : [])),
    [sessionSummaries],
  );
  const trend = useMemo(() => buildTrend(filteredEvents, trendGranularity), [filteredEvents, trendGranularity]);
  const landingSummary = useMemo(
    () => (landingId === ALL_LANDINGS ? buildLandingSummary(filteredEvents) : []),
    [filteredEvents, landingId],
  );

  // sessionSummaries is built from every event, not just VSL_Play, so its
  // size already is the count of distinct session_ids in the filtered
  // period — i.e. everyone who loaded the landing, whether or not they hit play.
  const totalSessions = sessionSummaries.length;
  const maxFunnelCount = funnel[0]?.count ?? 0;
  const playRate = totalSessions ? round1((maxFunnelCount / totalSessions) * 100) : 0;

  const ctaStage = funnel.find(f => f.key === 'cta');
  const submitStage = funnel.find(f => f.key === 'submit');
  const formSubmitCount = submitStage?.count ?? 0;
  // VSL_Form_Submit is the real conversion signal (fired from the thank-you
  // page after booking), more reliable than the CTA click.
  const realConversionRate = totalSessions ? round1((formSubmitCount / totalSessions) * 100) : 0;
  const formCompletionRate = ctaStage && ctaStage.count > 0
    ? round1((formSubmitCount / ctaStage.count) * 100)
    : null;

  const avgAbandonPercent = useMemo(() => {
    const withAbandon = sessionSummaries
      .map(s => s.lastAbandonPercent)
      .filter((p): p is number => p !== null);
    if (!withAbandon.length) return null;
    return Math.round(withAbandon.reduce((sum, p) => sum + p, 0) / withAbandon.length);
  }, [sessionSummaries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">VSL Tracking</h1>
        <p className="text-muted-foreground">
          Funnel de visualización y conversión del video de la landing ({totalSessions} sesiones en el período)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={landingId} onValueChange={setLandingId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Landing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LANDINGS}>Todas las landings</SelectItem>
            {landingOptions.map(id => (
              <SelectItem key={id} value={id}>{id}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={utmCampaign} onValueChange={setUtmCampaign}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Campaña (UTM)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CAMPAIGNS}>Todas las campañas</SelectItem>
            {campaignOptions.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRangeKey} onValueChange={(v) => setDateRangeKey(v as typeof dateRangeKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => (
              <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top stats: real conversion is the headline number, visitors is context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-success/30">
              <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-success">{realConversionRate}%</p>
                    <p className="text-sm text-muted-foreground">conversión real (Form Submit / visitantes)</p>
                  </div>
                </div>
                <Badge className="bg-success/15 text-success border-0 text-sm px-3 py-1.5">
                  {formSubmitCount} bookings
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{totalSessions.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">visitantes únicos en el período</p>
                  </div>
                </div>
                <Badge className="bg-primary/15 text-primary border-0 text-sm px-3 py-1.5">
                  {playRate}% dio play
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Per-landing summary — only meaningful once more than one landing exists */}
          {landingId === ALL_LANDINGS && landingSummary.length > 1 && (
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-medium">Resumen por landing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {landingSummary.map(row => (
                  <div key={row.landingId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                    <span className="font-medium">{row.landingId}</span>
                    <div className="flex gap-6 text-muted-foreground">
                      <span>{row.sessions} sesiones</span>
                      <span>{row.completions} completaron</span>
                      <span>{row.ctaClicks} clicks CTA</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Funnel */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Funnel de visualización a conversión
              </CardTitle>
              <CardDescription>Sesiones únicas que llegaron a cada etapa, desde Play hasta el booking completado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnel.map(stage => (
                <div key={stage.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{stage.count}</span>
                      {stage.key === 'submit' ? (
                        formCompletionRate !== null && (
                          <Badge className="bg-success/15 text-success border-0 text-xs">
                            {formCompletionRate}% completó el form
                          </Badge>
                        )
                      ) : (
                        stage.dropOffPct !== null && (
                          <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                            <TrendingDown className="h-3 w-3" />
                            -{stage.dropOffPct}%
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={stage.key === 'submit' ? 'h-full bg-success rounded-full transition-all' : 'h-full bg-primary rounded-full transition-all'}
                      style={{ width: maxFunnelCount ? `${(stage.count / maxFunnelCount) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
              {totalSessions === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">Sin datos para este filtro</p>
              )}
              {avgAbandonPercent !== null && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  Punto de abandono promedio (último cambio de pestaña por sesión): <span className="font-medium text-foreground">{avgAbandonPercent}%</span> del video
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CTA conversion by percent watched */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                  Clicks en CTA por % visto
                </CardTitle>
                <CardDescription>¿En qué momento del video clickea la gente?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ctaBreakdown.map(bucket => (
                  <div key={bucket.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{bucket.label}</p>
                      <p className="text-xs text-muted-foreground">{bucket.count} clicks · {bucket.pctOfTotal}% del total de clicks</p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-0">
                      {bucket.conversionRate}% de sesiones
                    </Badge>
                  </div>
                ))}
                {ctaBreakdown.every(b => b.count === 0) && (
                  <p className="text-center text-muted-foreground text-sm py-6">Sin clicks de CTA en este filtro</p>
                )}
              </CardContent>
            </Card>

            {/* Form submits by percent watched — the real conversion, by watch depth */}
            <Card className="bg-card border-success/30">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Submits por % visto
                </CardTitle>
                <CardDescription>¿Cuánto video necesita ver alguien para convertir de verdad?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {submitBreakdown.map(bucket => (
                  <div key={bucket.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{bucket.label}</p>
                      <p className="text-xs text-muted-foreground">{bucket.count} submits · {bucket.pctOfTotal}% del total de submits</p>
                    </div>
                    <Badge className="bg-success/15 text-success border-0">
                      {bucket.conversionRate}% de sesiones
                    </Badge>
                  </div>
                ))}
                {submitBreakdown.every(b => b.count === 0) && (
                  <p className="text-center text-muted-foreground text-sm py-6">Sin form submits en este filtro</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trend */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Tendencia</CardTitle>
                <CardDescription>Plays, finalizaciones y clicks de CTA en el tiempo</CardDescription>
              </div>
              <Select value={trendGranularity} onValueChange={(v) => setTrendGranularity(v as 'day' | 'week')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Por día</SelectItem>
                  <SelectItem value="week">Por semana</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="plays" stroke="hsl(var(--info))" strokeWidth={2} dot={false} name="Plays" />
                    <Line type="monotone" dataKey="completions" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Completaron (100%)" />
                    <Line type="monotone" dataKey="ctaClicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Clicks CTA" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
