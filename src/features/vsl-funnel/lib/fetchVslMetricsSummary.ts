import { supabase } from '@/integrations/supabase/client';

export interface VslMetricsSummary {
  sessions: number;
  playRate: number; // % de sesiones con VSL_Play
  conversionRate: number; // % de sesiones con VSL_Form_Submit
}

const WINDOW_DAYS = 30;

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
