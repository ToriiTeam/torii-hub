import { supabase } from '@/integrations/supabase/client';

const TORII_LANDING_ID = 'torii-principal';

interface VslEventRow {
  event_name: string;
  session_id: string | null;
}

// Deliberately duplicated (not imported) from src/pages/VslTracking.tsx's
// session-summary logic — that page is already tuned/audited and this
// avoids risking a regression there for a change scoped to the Executive
// Dashboard. Keep the two in sync by hand if the tracking events ever
// change shape.
interface SessionSummary {
  hasPlay: boolean;
  hasP25: boolean;
  hasP50: boolean;
  hasP75: boolean;
  hasP100: boolean;
  hasCta: boolean;
  hasAbandon: boolean;
}

function buildSessionSummaries(events: VslEventRow[]): Map<string, SessionSummary> {
  const map = new Map<string, SessionSummary>();
  for (const e of events) {
    if (!e.session_id) continue;
    let s = map.get(e.session_id);
    if (!s) {
      s = { hasPlay: false, hasP25: false, hasP50: false, hasP75: false, hasP100: false, hasCta: false, hasAbandon: false };
      map.set(e.session_id, s);
    }
    if (e.event_name === 'VSL_Play') s.hasPlay = true;
    if (e.event_name === 'VSL_Progress_25') s.hasP25 = true;
    if (e.event_name === 'VSL_Progress_50') s.hasP50 = true;
    if (e.event_name === 'VSL_Progress_75') s.hasP75 = true;
    if (e.event_name === 'VSL_Progress_100') s.hasP100 = true;
    if (e.event_name === 'VSL_CTA_Click') s.hasCta = true;
    if (e.event_name === 'VSL_Abandon') s.hasAbandon = true;
  }
  return map;
}

export interface VslFunnelData {
  plays: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  ctaClicks: number;
  abandonos: number;
}

export async function fetchVslFunnelData(since: string, until: string): Promise<VslFunnelData> {
  const { data, error } = await supabase
    .from('vsl_events')
    .select('event_name, session_id')
    .eq('landing_id', TORII_LANDING_ID)
    .gte('created_at', since)
    .lte('created_at', `${until}T23:59:59`);
  if (error) throw error;

  const events = (data ?? []) as VslEventRow[];
  const sessions = Array.from(buildSessionSummaries(events).values());

  return {
    plays: sessions.filter((s) => s.hasPlay).length,
    p25: sessions.filter((s) => s.hasP25).length,
    p50: sessions.filter((s) => s.hasP50).length,
    p75: sessions.filter((s) => s.hasP75).length,
    p100: sessions.filter((s) => s.hasP100).length,
    ctaClicks: sessions.filter((s) => s.hasCta).length,
    abandonos: sessions.filter((s) => s.hasAbandon).length,
  };
}
