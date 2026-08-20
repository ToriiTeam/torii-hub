import { supabase } from '@/integrations/supabase/client';

export interface VslMetricsSummary {
  sessions: number;
  playRate: number; // % de sesiones con VSL_Play
  conversionRate: number; // % de sesiones con VSL_Form_Submit
}

const WINDOW_DAYS = 30;

export interface VslFunnelStage {
  key: 'visitors' | 'play' | 'cta' | 'submit';
  label: string;
  count: number;
  pctOfVisitors: number; // 0-100, share of the first stage (visitors)
}

export interface VslClientFunnel {
  windowDays: number;
  landingCount: number; // cuántas tracked_landings del cliente tienen al menos 1 sesión en la ventana
  stages: VslFunnelStage[];
}

const EMPTY_FUNNEL = (landingCount = 0): VslClientFunnel => ({
  windowDays: WINDOW_DAYS,
  landingCount,
  stages: [
    { key: 'visitors', label: 'Visitantes', count: 0, pctOfVisitors: 0 },
    { key: 'play', label: 'Dieron Play', count: 0, pctOfVisitors: 0 },
    { key: 'cta', label: 'Click en CTA', count: 0, pctOfVisitors: 0 },
    { key: 'submit', label: 'Form Submit', count: 0, pctOfVisitors: 0 },
  ],
});

// Funnel agregado de TODAS las landings de un cliente (vía
// tracked_landings.client_id), reusando la misma semántica de eventos que
// VslTracking.tsx (VSL_Play / VSL_CTA_Click / VSL_Form_Submit) y la misma
// ventana de 30 días que fetchVslMetricsSummary — sin duplicar lógica de
// tracking ni inventar queries nuevas, solo agregado por client_id en vez
// de por landing_id puntual. Usado por la sub-subsección "Funnel" del VSL
// Funnel (cliente y Torii, mismo componente TabVSLFunnel.tsx).
export async function fetchVslFunnelForClient(clientId: string): Promise<VslClientFunnel> {
  const { data: landings, error: landingsErr } = await supabase
    .from('tracked_landings')
    .select('landing_id')
    .eq('client_id', clientId);
  if (landingsErr) throw landingsErr;

  const landingIds = (landings ?? []).map((l) => l.landing_id);
  if (landingIds.length === 0) return EMPTY_FUNNEL(0);

  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  const { data, error } = await supabase
    .from('vsl_events')
    .select('session_id, event_name, landing_id')
    .in('landing_id', landingIds)
    .gte('created_at', since.toISOString())
    .not('session_id', 'is', null);
  if (error) throw error;

  const sessions = new Map<string, { play: boolean; cta: boolean; submit: boolean }>();
  const landingsWithTraffic = new Set<string>();
  for (const e of data ?? []) {
    const sid = e.session_id as string;
    if (e.landing_id) landingsWithTraffic.add(e.landing_id);
    const s = sessions.get(sid) ?? { play: false, cta: false, submit: false };
    if (e.event_name === 'VSL_Play') s.play = true;
    if (e.event_name === 'VSL_CTA_Click') s.cta = true;
    if (e.event_name === 'VSL_Form_Submit') s.submit = true;
    sessions.set(sid, s);
  }

  const visitors = sessions.size;
  const play = [...sessions.values()].filter((s) => s.play).length;
  const cta = [...sessions.values()].filter((s) => s.cta).length;
  const submit = [...sessions.values()].filter((s) => s.submit).length;
  const pct = (n: number) => (visitors ? Math.round((n / visitors) * 1000) / 10 : 0);

  return {
    windowDays: WINDOW_DAYS,
    landingCount: landingsWithTraffic.size,
    stages: [
      { key: 'visitors', label: 'Visitantes', count: visitors, pctOfVisitors: pct(visitors) },
      { key: 'play', label: 'Dieron Play', count: play, pctOfVisitors: pct(play) },
      { key: 'cta', label: 'Click en CTA', count: cta, pctOfVisitors: pct(cta) },
      { key: 'submit', label: 'Form Submit', count: submit, pctOfVisitors: pct(submit) },
    ],
  };
}

// Mismas 3 métricas más representativas de VslTracking.tsx (visitantes,
// tasa de play, conversión por form submit), recalculadas acá con la
// misma definición pero sin traer todo ese módulo — solo lo necesario
// para un mini-resumen dentro de un VSL entry. Últimos 30 días, sin
// filtros de UTM/campaña (ese detalle vive en la página completa).
export async function fetchVslMetricsSummary(landingId: string): Promise<VslMetricsSummary> {
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  const { data, error } = await supabase
    .from('vsl_events')
    .select('session_id, event_name')
    .eq('landing_id', landingId)
    .gte('created_at', since.toISOString())
    .not('session_id', 'is', null);
  if (error) throw error;

  const sessions = new Map<string, { play: boolean; submit: boolean }>();
  for (const e of data ?? []) {
    const sid = e.session_id as string;
    const s = sessions.get(sid) ?? { play: false, submit: false };
    if (e.event_name === 'VSL_Play') s.play = true;
    if (e.event_name === 'VSL_Form_Submit') s.submit = true;
    sessions.set(sid, s);
  }

  const total = sessions.size;
  const plays = [...sessions.values()].filter((s) => s.play).length;
  const submits = [...sessions.values()].filter((s) => s.submit).length;

  return {
    sessions: total,
    playRate: total ? Math.round((plays / total) * 1000) / 10 : 0,
    conversionRate: total ? Math.round((submits / total) * 1000) / 10 : 0,
  };
}
