import { supabase } from '@/integrations/supabase/client';
import { summarizeAds, summarizeClosing, type RawAdsRow, type RawClosingRow } from '@/features/executive-dashboard/lib/fetchClientData';
import { safeDiv } from '@/features/executive-dashboard/lib/clientHealth';
import type { AdsMetrics, ClosingMetrics } from '@/features/executive-dashboard/types';
import type { PhaseKey } from '../types';

export interface PhaseMetrics {
  ads: AdsMetrics;
  closing: ClosingMetrics;
  cpbc: number | null;
}

async function fetchAdsRowsSince(clientId: string, since: string, until: string): Promise<RawAdsRow[]> {
  const { data, error } = await supabase
    .from('ads_metricas_diarias')
    .select('fecha, inversion, impresiones, clics, leads, ctr, cpm, cpc, ads_campanas!inner(client_id)')
    .eq('ads_campanas.client_id', clientId)
    .gte('fecha', since)
    .lte('fecha', until);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, campaign_name: null }));
}

async function fetchClosingRowsSince(clientId: string, since: string, until: string): Promise<RawClosingRow[]> {
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('fecha_llamada, se_presento, califico, cerro, closer, loss_reason')
    .eq('owner_type', 'client')
    .eq('client_id', clientId)
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);
  if (error) throw error;
  return data ?? [];
}

// Metrics for "how is this phase going" are computed over [fase.fecha_inicio,
// today] — not a calendar month — since that's the period that actually
// matters for judging progress within the phase.
export async function fetchPhaseMetrics(clientId: string, since: string): Promise<PhaseMetrics> {
  const until = new Date().toISOString().slice(0, 10);
  const [adsRows, closingRows] = await Promise.all([
    fetchAdsRowsSince(clientId, since, until),
    fetchClosingRowsSince(clientId, since, until),
  ]);
  const ads = summarizeAds(adsRows);
  const closing = summarizeClosing(closingRows);
  return { ads, closing, cpbc: safeDiv(ads.inversion, closing.reuniones) };
}

export interface PhaseMetricVisibility {
  cpbc: boolean;
  leads: boolean;
  ctr: boolean;
  showRate: boolean;
  qualRate: boolean;
  cierres: boolean;
  closeRate: boolean;
  revenue: boolean;
}

const NONE_VISIBLE: PhaseMetricVisibility = {
  cpbc: false, leads: false, ctr: false, showRate: false, qualRate: false, cierres: false, closeRate: false, revenue: false,
};

// Which metrics are relevant to show at each phase, per spec. Optimización/
// Escalado/Maximización show everything ("todas las métricas anteriores +
// tendencia") — the "+ tendencia" part is satisfied by these phases
// typically spanning a longer, more representative window (since/today can
// be months by this point), not a separate trend chart.
export function metricsVisibleForPhase(fase: PhaseKey): PhaseMetricVisibility {
  switch (fase) {
    case 'fundamentos':
    case 'testeo_mercado':
      return { ...NONE_VISIBLE, cpbc: true, leads: true, ctr: true };
    case 'testeo_funnel':
      return { ...NONE_VISIBLE, cpbc: true, showRate: true, qualRate: true };
    case 'validacion_ventas':
      return { ...NONE_VISIBLE, cierres: true, closeRate: true, revenue: true };
    case 'optimizacion_sistema':
    case 'escalado':
    case 'maximizacion':
      return { cpbc: true, leads: true, ctr: true, showRate: true, qualRate: true, cierres: true, closeRate: true, revenue: true };
    default:
      return NONE_VISIBLE;
  }
}
