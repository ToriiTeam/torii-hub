import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { PlayCircle, MousePointerClick, TrendingDown, TrendingUp, Users, CheckCircle2, Eye, Info, AlertTriangle } from 'lucide-react';
import { startOfWeek, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';

type VslEvent = Database['public']['Tables']['vsl_events']['Row'];

const ALL_LANDINGS = 'all';
const ALL_CAMPAIGNS = 'all';

// Fixed list, not derived from data — a landing should be selectable (and
// show up as all-zeros) even before its first event lands.
const LANDING_OPTIONS = [
  { id: 'torii-principal', label: 'Torii — Principal' },
  { id: 'adolfo-blasco', label: 'Adolfo Blasco' },
  { id: 'raul-galindo', label: 'Raul Galindo' },
] as const;

// Video progress milestones, in order. Each is a distinct event_name that
// Torii's VSL tracking script fires at most once per session_id.
const VIDEO_MILESTONES = [
  { key: 'play', label: 'Play', eventName: 'VSL_Play' },
  { key: 'p25', label: '25%', eventName: 'VSL_Progress_25' },
  { key: 'p50', label: '50%', eventName: 'VSL_Progress_50' },
  { key: 'p75', label: '75%', eventName: 'VSL_Progress_75' },
  { key: 'p100', label: '100%', eventName: 'VSL_Progress_100' },
] as const;

// Two separate funnels, kept apart because they don't nest the same way.
// Conversion steps (CTA click, form submit) can happen at any point in the
// video — someone can click the CTA without finishing it — so mixing them
// into the strictly-nested video-progress funnel produces "increases" that
// look like bugs but aren't (e.g. more CTA clicks than 100%-completions).

// Pipeline: visitor → played → clicked CTA → submitted the form. Each step
// is a strict subset of visitors, so this one is genuinely sequential.
const CONVERSION_STAGES: { key: string; label: string; matches: (s: SessionSummary) => boolean }[] = [
  { key: 'visitors', label: 'Visitantes únicos', matches: () => true },
  { key: 'play', label: 'Dieron Play', matches: (s: SessionSummary) => s.milestones.has('VSL_Play') },
  { key: 'cta', label: 'Click en CTA', matches: (s: SessionSummary) => s.ctaClicks.length > 0 },
  { key: 'submit', label: 'Form Submit', matches: (s: SessionSummary) => s.hasFormSubmit },
];

// Video depth: how far into the video people who played it actually got.
// Strictly nested (reaching 50% implies having crossed 25%), independent of
// whether they ever clicked the CTA or submitted the form.
const VIDEO_DEPTH_STAGES: { key: string; label: string; matches: (s: SessionSummary) => boolean }[] =
  VIDEO_MILESTONES.map(m => ({
    key: m.key,
    label: m.label,
    matches: (s: SessionSummary) => s.milestones.has(m.eventName),
  }));

// Mutually-exclusive buckets for the pipeline's video-depth breakdown: every
// session that gave play falls into EXACTLY one of these, by its highest
// `percent` seen across any event — unlike VIDEO_DEPTH_STAGES above, which
// is a cumulative "reached at least X%" funnel and double-counts on purpose.
const VIDEO_DISTRIBUTION_BUCKETS = [
  { key: '0-24', label: '0% – 24%', test: (p: number) => p < 25 },
  { key: '25-49', label: '25% – 49%', test: (p: number) => p >= 25 && p < 50 },
  { key: '50-74', label: '50% – 74%', test: (p: number) => p >= 50 && p < 75 },
  { key: '75-99', label: '75% – 99%', test: (p: number) => p >= 75 && p < 100 },
  { key: '100', label: '100%', test: (p: number) => p >= 100 },
] as const;

interface VideoDistributionBucket { key: string; label: string; count: number; }

// Buckets only the sessions that gave play, each counted once, in its single
// highest-reached bucket — so the bucket counts always sum to exactly the
// "Dieron play" count. The ranges are exhaustive and non-overlapping over
// [0, ∞) by construction, but this is asserted rather than just trusted
// visually, per the bug this replaced (CTA/submit mixed into a strictly
// nested funnel made unrelated numbers look like drop-off errors).
function buildVideoDistribution(sessions: SessionSummary[]): { buckets: VideoDistributionBucket[]; playCount: number } {
  const playSessions = sessions.filter(s => s.milestones.has('VSL_Play'));
  const buckets = VIDEO_DISTRIBUTION_BUCKETS.map(b => ({
    key: b.key,
    label: b.label,
    count: playSessions.filter(s => b.test(s.maxPercentSeen)).length,
  }));
  const sum = buckets.reduce((acc, b) => acc + b.count, 0);
  if (sum !== playSessions.length) {
    console.error(`[VslTracking] video distribution buckets sum to ${sum}, expected ${playSessions.length} (play sessions) — bucket ranges are no longer exhaustive/exclusive`);
  }
  return { buckets, playCount: playSessions.length };
}

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

const FORM_SUBMIT_NOTE = 'Solo cuenta leads que calificaron en el formulario y completaron el booking. Los no calificados no generan este evento.';

// Root cause confirmed and fixed: torii-principal had the tracking Custom
// Code pasted into both the landing AND the TKP page, double-firing
// VSL_Form_Submit with a timing issue that dropped session_id on one of the
// two. The TKP block was removed; a fresh test booking on 2026-07-13
// confirmed a single VSL_Form_Submit row with session_id populated. Every
// orphan (session_id null) row on record is dated on or before 2026-07-12 —
// this is a fixed cutoff, not a guess (see the conversation that diagnosed
// it), unlike the "no clean cutoff" case this replaces.
const FORM_SUBMIT_BUG_FIXED_ON = '2026-07-13';

// Small info icon with a hover tooltip, for clarifying a metric's exact
// definition inline without cluttering the label.
function InfoNote({ text }: { text: string }) {
  return (
    <UiTooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block align-text-top ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </UiTooltip>
  );
}

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
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  milestones: Set<string>;
  ctaClicks: number[]; // percent-at-click for every VSL_CTA_Click this session fired
  hasFormSubmit: boolean;
  formSubmitPercent: number | null; // percent watched at the moment of the (first) submit
  lastAbandonPercent: number | null;
  // Highest `percent` seen across every event of this session, regardless of
  // event type (Play/Pause/Abandon/Progress_*/Complete all carry one). Used
  // for the pipeline's video-depth distribution, which needs the session's
  // real high-water mark rather than the discrete Progress_25/50/75/100
  // milestones — e.g. a session that paused at 55% but never crossed the
  // Progress_50 milestone-fired threshold still belongs in "50%–74%".
  maxPercentSeen: number;
}

// The highest video-progress milestone a session reached, as a discrete
// percent (0/25/50/75/100). Note this is independent of VSL_Play — a
// session can have played without crossing the 25% milestone yet.
function getMaxProgress(s: SessionSummary): number {
  if (s.milestones.has('VSL_Progress_100')) return 100;
  if (s.milestones.has('VSL_Progress_75')) return 75;
  if (s.milestones.has('VSL_Progress_50')) return 50;
  if (s.milestones.has('VSL_Progress_25')) return 25;
  return 0;
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
        utmSource: e.utm_source,
        utmCampaign: e.utm_campaign,
        utmContent: e.utm_content,
        milestones: new Set(),
        ctaClicks: [],
        hasFormSubmit: false,
        formSubmitPercent: null,
        lastAbandonPercent: null,
        maxPercentSeen: 0,
      };
      map.set(e.session_id, s);
    }

    const eventPercent = pct(e.percent);
    if (eventPercent > s.maxPercentSeen) s.maxPercentSeen = eventPercent;

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

function buildFunnel(
  sessions: SessionSummary[],
  stages: { key: string; label: string; matches: (s: SessionSummary) => boolean }[],
): FunnelStage[] {
  const counts = stages.map(stage => ({
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

interface UtmBreakdownRow {
  key: string; // display label for the group ('Sin UTM' when the value is null)
  fullValue: string | null; // untruncated value, for the tooltip — null when there's nothing to show
  campaign: string | null; // only populated when a getCampaign() fn is passed in
  sessions: number;
  playRate: number;
  avgProgress: number;
  ctaClicks: number;
  formSubmits: number;
  conversionRate: number; // formSubmits / sessions
}

const NO_UTM_LABEL = 'Sin UTM';

// Shared by the source/content/campaign tables — groups sessions by
// whatever UTM field getGroupKey() picks, all from data already in memory.
function buildUtmBreakdown(
  sessions: SessionSummary[],
  getGroupKey: (s: SessionSummary) => string | null,
  getCampaign?: (s: SessionSummary) => string | null,
): UtmBreakdownRow[] {
  const groups = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const key = getGroupKey(s) ?? NO_UTM_LABEL;
    const group = groups.get(key);
    if (group) group.push(s);
    else groups.set(key, [s]);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const total = group.length;
    const playCount = group.filter(s => s.milestones.has('VSL_Play')).length;
    const formSubmits = group.filter(s => s.hasFormSubmit).length;
    return {
      key,
      fullValue: key === NO_UTM_LABEL ? null : key,
      // Assumes one campaign per group (an ad/campaign doesn't change UTMs
      // mid-flight) — takes the first session's value as representative.
      campaign: getCampaign ? getCampaign(group[0]) ?? NO_UTM_LABEL : null,
      sessions: total,
      playRate: total ? round1((playCount / total) * 100) : 0,
      avgProgress: total ? Math.round(group.reduce((sum, s) => sum + getMaxProgress(s), 0) / total) : 0,
      ctaClicks: group.reduce((sum, s) => sum + s.ctaClicks.length, 0),
      formSubmits,
      conversionRate: total ? round1((formSubmits / total) * 100) : 0,
    };
  });
}

function truncateId(value: string, len = 12): string {
  return value.length > len ? `${value.slice(0, len)}...` : value;
}

// A value cell that truncates long IDs (utm_content) and shows the full
// value in a tooltip on hover.
function TruncatedCell({ value }: { value: string }) {
  const truncated = truncateId(value);
  if (truncated === value) return <>{value}</>;
  return (
    <UiTooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-muted-foreground">{truncated}</span>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </UiTooltip>
  );
}

interface UtmBreakdownTableProps {
  rows: UtmBreakdownRow[];
  labelHeader: string;
  truncateLabel?: boolean;
  showCampaignColumn?: boolean;
}

function UtmBreakdownTable({ rows, labelHeader, truncateLabel, showCampaignColumn }: UtmBreakdownTableProps) {
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-6">Sin datos para este filtro</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          {showCampaignColumn && <TableHead>Campaña</TableHead>}
          <TableHead className="text-right">Sesiones</TableHead>
          <TableHead className="text-right">Tasa de play</TableHead>
          <TableHead className="text-right">% prom. visto</TableHead>
          <TableHead className="text-right">CTA Clicks</TableHead>
          <TableHead className="text-right">
            Form Submits
            <InfoNote text={FORM_SUBMIT_NOTE} />
          </TableHead>
          <TableHead className="text-right">Conversión</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">
              {truncateLabel && row.fullValue ? <TruncatedCell value={row.fullValue} /> : row.key}
            </TableCell>
            {showCampaignColumn && (
              <TableCell className="text-muted-foreground">
                {row.campaign && row.campaign !== NO_UTM_LABEL
                  ? <TruncatedCell value={row.campaign} />
                  : row.campaign}
              </TableCell>
            )}
            <TableCell className="text-right">{row.sessions}</TableCell>
            <TableCell className="text-right">{row.playRate}%</TableCell>
            <TableCell className="text-right">{row.avgProgress}%</TableCell>
            <TableCell className="text-right">{row.ctaClicks}</TableCell>
            <TableCell className="text-right">{row.formSubmits}</TableCell>
            <TableCell className="text-right">
              <Badge className={row.conversionRate > 0 ? 'bg-success/15 text-success border-0' : 'bg-muted text-muted-foreground border-0'}>
                {row.conversionRate}%
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
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

  // Earliest event ever recorded for the selected landing — deliberately
  // independent of dateRangeKey (a "últimos 7 días" filter would otherwise
  // make every landing look 7 days old). Answers "how many days of data am
  // I looking at", which matters most for small samples.
  const [trackingSince, setTrackingSince] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function loadEarliest() {
      let query = supabase.from('vsl_events').select('created_at').order('created_at', { ascending: true }).limit(1);
      if (landingId !== ALL_LANDINGS) query = query.eq('landing_id', landingId);
      const { data, error } = await query;
      if (cancelled) return;
      if (error) { console.error('Error loading earliest VSL event:', error); setTrackingSince(null); return; }
      setTrackingSince(data?.[0]?.created_at ?? null);
    }
    loadEarliest();
    return () => { cancelled = true; };
  }, [landingId]);

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

  const conversionFunnel = useMemo(() => buildFunnel(sessionSummaries, CONVERSION_STAGES), [sessionSummaries]);
  const videoFunnel = useMemo(() => buildFunnel(sessionSummaries, VIDEO_DEPTH_STAGES), [sessionSummaries]);
  const videoDistribution = useMemo(() => buildVideoDistribution(sessionSummaries), [sessionSummaries]);
  const ctaBreakdown = useMemo(
    () => buildPercentBreakdown(sessionSummaries, s => s.ctaClicks),
    [sessionSummaries],
  );
  // Total individual VSL_CTA_Click events (not deduplicated by session) —
  // shown alongside the breakdown to make explicit that it can exceed the
  // "Visitantes que clickearon CTA" KPI above when someone clicks more than
  // once.
  const ctaClicksTotal = useMemo(
    () => sessionSummaries.reduce((sum, s) => sum + s.ctaClicks.length, 0),
    [sessionSummaries],
  );
  const submitBreakdown = useMemo(
    () => buildPercentBreakdown(sessionSummaries, s => (s.formSubmitPercent !== null ? [s.formSubmitPercent] : [])),
    [sessionSummaries],
  );
  const trend = useMemo(() => buildTrend(filteredEvents, trendGranularity), [filteredEvents, trendGranularity]);

  // Only meaningful in the "all landings" view — when a specific landing is
  // selected, sessionSummaries already only contains that one landing.
  const landingBreakdown = useMemo(
    () => (landingId === ALL_LANDINGS
      ? buildUtmBreakdown(sessionSummaries, s => s.landingId).sort((a, b) => b.sessions - a.sessions)
      : []),
    [sessionSummaries, landingId],
  );

  const sourceBreakdown = useMemo(
    () => buildUtmBreakdown(sessionSummaries, s => s.utmSource)
      .sort((a, b) => b.sessions - a.sessions),
    [sessionSummaries],
  );
  const contentBreakdown = useMemo(
    () => buildUtmBreakdown(sessionSummaries, s => s.utmContent, s => s.utmCampaign)
      .sort((a, b) => b.conversionRate - a.conversionRate),
    [sessionSummaries],
  );
  const campaignBreakdown = useMemo(
    () => buildUtmBreakdown(sessionSummaries, s => s.utmCampaign)
      .sort((a, b) => b.sessions - a.sessions),
    [sessionSummaries],
  );

  // sessionSummaries is built from every event, not just VSL_Play, so its
  // size already is the count of distinct session_ids in the filtered
  // period — i.e. everyone who loaded the landing, whether or not they hit play.
  const totalSessions = sessionSummaries.length;
  const maxFunnelCount = videoFunnel[0]?.count ?? 0;
  const playRate = totalSessions ? round1((maxFunnelCount / totalSessions) * 100) : 0;
  const conversionMax = conversionFunnel[0]?.count ?? 0;

  const ctaStage = conversionFunnel.find(f => f.key === 'cta');
  const submitStage = conversionFunnel.find(f => f.key === 'submit');
  const attributedFormSubmits = submitStage?.count ?? 0;

  // Defensive workaround for a now-fixed bug in the (external, not in this
  // repo) tracking script: torii-principal had its Custom Code pasted into
  // both the landing and the TKP page, and one of the two double-fired
  // VSL_Form_Submit without a session_id — see FORM_SUBMIT_BUG_FIXED_ON.
  // buildSessionSummaries's `if (!e.session_id) continue` silently dropped
  // those, undercounting the one KPI that matters most. Those events can't
  // be attributed to a session (no funnel placement, no conversion-rate
  // denominator), but they ARE real completed forms, so the raw total below
  // counts them anyway. Everything session-based (conversionFunnel, the
  // pipeline's "submit" stage/bar, dropOffPct) stays untouched and keeps
  // using attributedFormSubmits only. Kept even after the fix, since the 5
  // historical orphan rows (2026-07-02 → 2026-07-12) are permanent —
  // they can't be retroactively attributed to a session.
  const orphanFormSubmits = useMemo(
    () => filteredEvents.filter(e => e.event_name === 'VSL_Form_Submit' && !e.session_id).length,
    [filteredEvents],
  );
  const formSubmitCount = attributedFormSubmits + orphanFormSubmits;

  // VSL_Form_Submit is the real conversion signal (fired from the thank-you
  // page after booking), more reliable than the CTA click. Rates stay
  // session-based (attributedFormSubmits) — a rate "of visitors"/"of CTA
  // clicks" only makes sense for submits actually tied to one.
  const realConversionRate = totalSessions ? round1((attributedFormSubmits / totalSessions) * 100) : 0;
  const formCompletionRate = ctaStage && ctaStage.count > 0
    ? round1((attributedFormSubmits / ctaStage.count) * 100)
    : null;

  // Average % of the VIDEO watched at the moment of the last tab-switch —
  // a video engagement metric, not a share of the audience (that's the
  // separate "tasa de abandono" below).
  const avgAbandonPercent = useMemo(() => {
    const withAbandon = sessionSummaries
      .map(s => s.lastAbandonPercent)
      .filter((p): p is number => p !== null);
    if (!withAbandon.length) return null;
    return Math.round(withAbandon.reduce((sum, p) => sum + p, 0) / withAbandon.length);
  }, [sessionSummaries]);

  // Share of the audience (sessions that hit Play) who never completed the
  // booking form.
  const abandonRate = useMemo(() => {
    const playSessions = sessionSummaries.filter(s => s.milestones.has('VSL_Play'));
    if (!playSessions.length) return 0;
    return round1((playSessions.filter(s => !s.hasFormSubmit).length / playSessions.length) * 100);
  }, [sessionSummaries]);

  const viewedOver50Count = useMemo(
    () => sessionSummaries.filter(s => getMaxProgress(s) >= 50).length,
    [sessionSummaries],
  );

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
            {LANDING_OPTIONS.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
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
          {/* Context for how many days of data the KPIs below represent —
              independent of the date-range filter on purpose, see the
              trackingSince effect above. Matters most for small samples. */}
          <p className="text-xs text-muted-foreground">
            {trackingSince
              ? `Trackeando desde ${format(parseISO(trackingSince), 'd MMM yyyy')} (${differenceInCalendarDays(new Date(), parseISO(trackingSince))} días de datos)`
              : 'Sin eventos registrados todavía para esta landing'}
          </p>

          {/* Flag for the now-fixed tracking-script bug (session_id null on
              VSL_Form_Submit) — see orphanFormSubmits/FORM_SUBMIT_BUG_FIXED_ON
              above. Still shown because the historical orphan rows are
              permanent, but worded as resolved rather than "go investigate" —
              new VSL_Form_Submit rows from the fix date on all carry a real
              session_id, so this count won't grow anymore. Not hardcoded to
              torii-principal — shows for whatever landing(s) are in view. */}
          {orphanFormSubmits > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              ⚠️ {orphanFormSubmits} formulario{orphanFormSubmits !== 1 ? 's' : ''} anterior{orphanFormSubmits !== 1 ? 'es' : ''} al {format(parseISO(FORM_SUBMIT_BUG_FIXED_ON), 'd-MMM-yyyy', { locale: es })} no se {orphanFormSubmits !== 1 ? 'pudieron' : 'pudo'} atribuir a una sesión (bug de tracking ya corregido).
            </div>
          )}

          {/* Top KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <Users className="h-6 w-6 text-primary" />
                <p className="text-2xl font-bold mt-3">{totalSessions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Visitantes únicos</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <PlayCircle className="h-6 w-6 text-info" />
                <p className="text-2xl font-bold mt-3">{maxFunnelCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Dieron play</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <TrendingUp className="h-6 w-6 text-info" />
                <p className="text-2xl font-bold mt-3">{playRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de engagement</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <Eye className="h-6 w-6 text-primary" />
                <p className="text-2xl font-bold mt-3">{viewedOver50Count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Vieron +50%</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <MousePointerClick className="h-6 w-6 text-primary" />
                <p className="text-2xl font-bold mt-3">{(ctaStage?.count ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Visitantes que clickearon CTA
                  <InfoNote text="Sesiones únicas con al menos un click en el CTA. Si alguien clickeó más de una vez, cuenta una sola vez acá — ver el desglose 'Clicks en CTA por % visto' para el total de clicks." />
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-success/30">
              <CardContent className="p-4">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <p className="text-2xl font-bold mt-3 text-success">{formSubmitCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Calificaron y agendaron
                  <InfoNote text={FORM_SUBMIT_NOTE} />
                </p>
                <p className="text-xs text-muted-foreground/70">{realConversionRate}% de los visitantes</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <TrendingDown className="h-6 w-6 text-destructive" />
                <p className="text-2xl font-bold mt-3">{avgAbandonPercent !== null ? `${avgAbandonPercent}%` : '—'}</p>
                <p className="text-xs text-muted-foreground">Punto de abandono promedio</p>
                <p className="text-xs text-muted-foreground/70">% del video visto al abandonar</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <TrendingDown className="h-6 w-6 text-destructive" />
                <p className="text-2xl font-bold mt-3">{abandonRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de abandono</p>
                <p className="text-xs text-muted-foreground/70">visitantes que no completaron el booking</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-landing summary — only shown in the "all landings" view, once more than one landing has data */}
          {landingId === ALL_LANDINGS && landingBreakdown.length > 1 && (
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-medium">Resumen por landing</CardTitle>
                <CardDescription>Ordenado por sesiones</CardDescription>
              </CardHeader>
              <CardContent>
                <UtmBreakdownTable rows={landingBreakdown} labelHeader="Landing" />
              </CardContent>
            </Card>
          )}

          {/* Pipeline de conversión — visitantes → play son subconjuntos
              anidados; de ahí en más, cada sesión que dio play cae en
              EXACTAMENTE un bucket de video (mutuamente excluyentes entre
              sí, suman "Dieron play"), mientras que CTA y Form Submit son
              conteos absolutos independientes del bucket — una sesión puede
              estar en "100%" y también contar en "Click en CTA" a la vez. */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Pipeline de conversión
              </CardTitle>
              <CardDescription>En qué etapa está cada sesión — los buckets de video son excluyentes entre sí; CTA y Form Submit son totales absolutos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['visitors', 'play'] as const).map(key => {
                const stage = conversionFunnel.find(s => s.key === key)!;
                return (
                  <div key={stage.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{stage.count}</span>
                        {stage.dropOffPct !== null && (
                          <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                            <TrendingDown className="h-3 w-3" />
                            -{stage.dropOffPct}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: conversionMax ? `${(stage.count / conversionMax) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Distribución excluyente de las sesiones que dieron play,
                  por el % máximo alcanzado — suma exactamente "Dieron play". */}
              <div className="pl-4 border-l-2 border-border/50 space-y-2 py-1">
                <p className="text-xs text-muted-foreground">De las que dieron play, cuánto vieron (excluyente, suma = {videoDistribution.playCount})</p>
                {videoDistribution.buckets.map(bucket => (
                  <div key={bucket.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{bucket.label}</span>
                      <span className="text-muted-foreground">{bucket.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-info rounded-full transition-all"
                        style={{ width: videoDistribution.playCount ? `${(bucket.count / videoDistribution.playCount) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {(['cta', 'submit'] as const).map(key => {
                const stage = conversionFunnel.find(s => s.key === key)!;
                return (
                  <div key={stage.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {stage.label}
                        {stage.key === 'submit' && <InfoNote text={FORM_SUBMIT_NOTE} />}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{stage.count}</span>
                        {stage.key === 'submit' && formCompletionRate !== null && (
                          <Badge className="bg-success/15 text-success border-0 text-xs">
                            {formCompletionRate}% completó el form
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={stage.key === 'submit' ? 'h-full bg-success rounded-full transition-all' : 'h-full bg-primary rounded-full transition-all'}
                        style={{ width: conversionMax ? `${(stage.count / conversionMax) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalSessions === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">Sin datos para este filtro</p>
              )}
            </CardContent>
          </Card>

          {/* Profundidad de visualización del video — strictly nested
              milestones only (Play → 25% → 50% → 75% → 100%), separate from
              the conversion pipeline above so a CTA click before finishing
              the video doesn't look like a funnel that "goes back up". */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Profundidad de visualización del video
              </CardTitle>
              <CardDescription>De quienes dieron play, cuánto del video vieron</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {videoFunnel.map(stage => (
                <div key={stage.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{stage.count}</span>
                      {stage.dropOffPct !== null && (
                        <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                          <TrendingDown className="h-3 w-3" />
                          -{stage.dropOffPct}%
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
                {ctaClicksTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {ctaClicksTotal.toLocaleString()} clics totales
                    {ctaClicksTotal !== (ctaStage?.count ?? 0) && ' (algunos visitantes clickearon más de una vez)'}
                  </p>
                )}
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
                  <InfoNote text={FORM_SUBMIT_NOTE} />
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

          {/* Breakdown by source/ad/campaign — UtmBreakdownTable itself
              renders the "Sin datos" empty state, so no session-count gate
              is needed here. */}
          <div className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-medium">Desglose por fuente (utm_source)</CardTitle>
                <CardDescription>Ordenado por sesiones</CardDescription>
              </CardHeader>
              <CardContent>
                <UtmBreakdownTable rows={sourceBreakdown} labelHeader="Fuente" />
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-medium">Desglose por anuncio (utm_content)</CardTitle>
                <CardDescription>Ordenado por tasa de conversión</CardDescription>
              </CardHeader>
              <CardContent>
                <UtmBreakdownTable rows={contentBreakdown} labelHeader="Anuncio" truncateLabel showCampaignColumn />
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-medium">Desglose por campaña (utm_campaign)</CardTitle>
                <CardDescription>Ordenado por sesiones</CardDescription>
              </CardHeader>
              <CardContent>
                <UtmBreakdownTable rows={campaignBreakdown} labelHeader="Campaña" />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
