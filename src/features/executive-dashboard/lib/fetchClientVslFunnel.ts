import { supabase } from '@/integrations/supabase/client';
import { fetchAdsRows, fetchClosingRows, summarizeAds, summarizeClosing } from './fetchClientData';
import type { VslFunnelData } from './fetchVslFunnel';
import type { VslFunnelMetrics } from '../types';

// Per-client counterpart to fetchVslFunnel.ts/fetchAuditorVslFunnel.ts — feeds
// the SAME VslFunnelView cards (Inversión/CPBC/Impresiones/.../Cierres/No
// cierres) shown in Dashboard Ejecutivo → Torii → VSL Funnel, but scoped to
// one arbitrary client_id instead of Torii's own house accounts. Reuses
// fetchAdsRows/fetchClosingRows/summarizeAds/summarizeClosing from
// fetchClientData.ts (same per-client ads_campanas.client_id / client_closer_calls
// queries ClientView.tsx already uses) — no new metric formulas, just a new
// mount point for the existing ones. Used for both real clients and the
// "Torii (interno)" casillero — both are regular rows in `clients`, so the
// same client_id-scoped queries apply to either.

interface VslEventRow { event_name: string; session_id: string | null; }

// Deliberately duplicated from fetchVslFunnel.ts (which itself duplicates
// VslTracking.tsx's session logic on purpose, see that file's comment) —
// same reasoning: this is a narrow, already-scoped query and shouldn't risk
// a regression in the pages it's copied from by importing across them.
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

// vsl_events.client_id is populated directly (see fetchVslSummary in
// fetchClientData.ts) — no need to go through tracked_landings here.
async function fetchClientVslEvents(clientId: string, since: string, until: string): Promise<VslFunnelData> {
  const { data, error } = await supabase
    .from('vsl_events')
    .select('event_name, session_id')
    .eq('client_id', clientId)
    .not('utm_source', 'is', null)
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

export interface ClientVslFunnelResult {
  metrics: VslFunnelMetrics;
  vslFunnelData: VslFunnelData;
}

export async function fetchClientVslFunnelData(clientId: string, since: string, until: string): Promise<ClientVslFunnelResult> {
  const [adsRows, closingRows, vslFunnelData] = await Promise.all([
    fetchAdsRows(clientId, since, until),
    fetchClosingRows(clientId, since, until),
    fetchClientVslEvents(clientId, since, until),
  ]);

  // Same definition CPBC/"Costo por llamada calificada" uses everywhere
  // else (fetchToriiData.ts, fetchAuditorVslFunnel.ts): se_presento AND
  // califico. Torii's own version also requires fuente='ADS', which doesn't
  // apply here — a client's calls aren't split by acquisition channel the
  // same way, and fetchClosingRows already scopes to this client's own
  // owner_type='client' rows.
  const qualifiedAdsCalls = closingRows.filter((r) => r.se_presento && r.califico).length;

  return {
    metrics: {
      ads: summarizeAds(adsRows),
      closing: summarizeClosing(closingRows),
      qualifiedAdsCalls,
    },
    vslFunnelData,
  };
}
