import { supabase } from '@/integrations/supabase/client';
import { EMPTY_METRICS, type ReportMetrics, type TrendPoint } from '../types';

interface MetaMetricsResult {
  inversionTotal: number;
  impresiones: number;
  clics: number;
  leads: number;
  alcanceTotal: number;
  trend: TrendPoint[];
  sinDatosMeta: boolean;
}

// ads_metricas_diarias joined through ads_campanas to scope by client —
// the daily table itself only has campana_id, not client_id directly (see
// syncMetaToSupabase.ts, which is what actually populates these two tables
// now via the background sync).
async function fetchMetaMetrics(clientId: string, since: string, until: string): Promise<MetaMetricsResult> {
  const { data, error } = await supabase
    .from('ads_metricas_diarias')
    .select('fecha, inversion, impresiones, clics, leads, alcance, ads_campanas!inner(client_id)')
    .eq('ads_campanas.client_id', clientId)
    .gte('fecha', since)
    .lte('fecha', until);

  if (error || !data || data.length === 0) {
    return { inversionTotal: 0, impresiones: 0, clics: 0, leads: 0, alcanceTotal: 0, trend: [], sinDatosMeta: true };
  }

  let inversionTotal = 0;
  let impresiones = 0;
  let clics = 0;
  let leads = 0;
  let alcanceTotal = 0;
  const trendByDay = new Map<string, { inversion: number; leads: number }>();

  for (const row of data) {
    const inv = row.inversion ? parseFloat(String(row.inversion)) : 0;
    const rowImpresiones = row.impresiones ?? 0;
    const rowClics = row.clics ?? 0;
    const rowLeads = row.leads ?? 0;
    const rowAlcance = row.alcance ?? 0;

    inversionTotal += inv;
    impresiones += rowImpresiones;
    clics += rowClics;
    leads += rowLeads;
    alcanceTotal += rowAlcance;

    const day = trendByDay.get(row.fecha) ?? { inversion: 0, leads: 0 };
    day.inversion += inv;
    day.leads += rowLeads;
    trendByDay.set(row.fecha, day);
  }

  const trend = Array.from(trendByDay.entries())
    .map(([fecha, v]) => ({ fecha, ...v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { inversionTotal, impresiones, clics, leads, alcanceTotal, trend, sinDatosMeta: false };
}

interface ClosingMetricsResult {
  reuniones: number;
  asistencias: number;
  cierres: number;
}

async function fetchClosingMetrics(clientId: string, since: string, until: string): Promise<ClosingMetricsResult> {
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('se_presento, cerro')
    .eq('client_id', clientId)
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);

  if (error || !data) return { reuniones: 0, asistencias: 0, cierres: 0 };

  return {
    reuniones: data.length,
    asistencias: data.filter((r) => r.se_presento).length,
    cierres: data.filter((r) => r.cerro).length,
  };
}

export async function fetchMonthlyMetrics(
  clientId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<{ metrics: ReportMetrics; trend: TrendPoint[] }> {
  const since = fechaInicio;
  const until = fechaFin;

  const [meta, closing] = await Promise.all([
    fetchMetaMetrics(clientId, since, until),
    fetchClosingMetrics(clientId, since, until),
  ]);

  if (meta.sinDatosMeta) {
    // Per spec: no ads_metricas_diarias rows for this client/month → zeros
    // with the flag set, rather than pretending spend was actually $0.
    return { metrics: { ...EMPTY_METRICS, sinDatosMeta: true }, trend: [] };
  }

  const { inversionTotal, impresiones, clics, leads, alcanceTotal, trend } = meta;
  const { reuniones, asistencias, cierres } = closing;

  const metrics: ReportMetrics = {
    inversionTotal,
    impresiones,
    clics,
    leads,
    cpl: leads > 0 ? inversionTotal / leads : null,
    // Literal spec formula (inversión / alcance) — not the standard
    // "cost per thousand" CPM, which would multiply by 1000. Kept as
    // specified rather than "corrected" to the textbook definition.
    cpmAprox: alcanceTotal > 0 ? inversionTotal / alcanceTotal : null,
    reuniones,
    cpbc: reuniones > 0 ? inversionTotal / reuniones : null,
    cac: cierres > 0 ? inversionTotal / cierres : null,
    conversionLeadReunion: leads > 0 ? (reuniones / leads) * 100 : null,
    showRate: reuniones > 0 ? (asistencias / reuniones) * 100 : null,
    cierres,
    sinDatosMeta: false,
  };

  return { metrics, trend };
}
