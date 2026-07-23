import { supabase } from '@/integrations/supabase/client';
import { subMonths, format, startOfMonth, endOfMonth, differenceInCalendarDays, startOfWeek, parseISO } from 'date-fns';
import { safeDiv } from './clientHealth';
import { eachDay, previousPeriodRange } from './periodRange';
import { PHASE_LABELS } from '@/features/delivery-os/types';
import type {
  AdsMetrics, ClientBase, ClientDetailData, ClosingMetrics, DailyPoint, MonthlyCpbcPoint,
  RevenueMetrics, TopCampaign, TrendPoint, VslSummary,
} from '../types';

// Commission Torii earns servicing this client's closed deals, falling back
// to precio when comision_estimada hasn't been filled in yet — same source
// and fallback rule as fetchRevenueByClient in fetchPortfolioData.ts.
async function fetchClientRevenue(clientId: string, since: string, until: string): Promise<number> {
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('comision_estimada, precio')
    .eq('owner_type', 'client')
    .eq('client_id', clientId)
    .eq('cerro', true)
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => {
    const amount = r.comision_estimada ?? r.precio;
    return sum + (amount ? parseFloat(String(amount)) : 0);
  }, 0);
}

export interface RawAdsRow { fecha: string; inversion: number | null; impresiones: number | null; clics: number | null; leads: number | null; ctr: number | null; cpm: number | null; cpc: number | null; campaign_name: string | null; }

async function fetchAdsRows(clientId: string, since: string, until: string): Promise<RawAdsRow[]> {
  const { data, error } = await supabase
    .from('ads_metricas_diarias')
    .select('fecha, inversion, impresiones, clics, leads, ctr, cpm, cpc, ads_campanas!inner(client_id, nombre)')
    .eq('ads_campanas.client_id', clientId)
    .gte('fecha', since)
    .lte('fecha', until);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    fecha: row.fecha,
    inversion: row.inversion, impresiones: row.impresiones, clics: row.clics, leads: row.leads,
    ctr: row.ctr, cpm: row.cpm, cpc: row.cpc,
    campaign_name: row.ads_campanas?.nombre ?? null,
  }));
}

export function summarizeAds(rows: RawAdsRow[]): AdsMetrics {
  let inversion = 0, impresiones = 0, clics = 0, leads = 0, ctrSum = 0, cpmSum = 0, cpcSum = 0;
  for (const r of rows) {
    inversion += r.inversion ? parseFloat(String(r.inversion)) : 0;
    impresiones += r.impresiones ?? 0;
    clics += r.clics ?? 0;
    leads += r.leads ?? 0;
    ctrSum += r.ctr ? parseFloat(String(r.ctr)) : 0;
    cpmSum += r.cpm ? parseFloat(String(r.cpm)) : 0;
    cpcSum += r.cpc ? parseFloat(String(r.cpc)) : 0;
  }
  const n = rows.length;
  return {
    inversion, impresiones, clics, leads,
    cpl: safeDiv(inversion, leads),
    ctr: n > 0 ? ctrSum / n : null,
    cpm: n > 0 ? cpmSum / n : null,
    cpc: n > 0 ? cpcSum / n : null,
  };
}

export interface RawClosingRow { fecha_llamada: string | null; se_presento: boolean | null; califico: boolean | null; cerro: boolean | null; closer: string | null; loss_reason: string | null; }

async function fetchClosingRows(clientId: string, since: string, until: string): Promise<RawClosingRow[]> {
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

export function summarizeClosing(rows: RawClosingRow[]): ClosingMetrics {
  const reuniones = rows.length;
  const asistieron = rows.filter((r) => r.se_presento).length;
  const calificados = rows.filter((r) => r.califico).length;
  const cierres = rows.filter((r) => r.cerro).length;
  const noCierres = rows.filter((r) => r.se_presento && !r.cerro).length;

  const lossMap = new Map<string, number>();
  const closerMap = new Map<string, { cierres: number; reuniones: number }>();
  for (const r of rows) {
    if (!r.cerro && r.loss_reason) lossMap.set(r.loss_reason, (lossMap.get(r.loss_reason) ?? 0) + 1);
    const closerName = r.closer ?? 'Sin asignar';
    const acc = closerMap.get(closerName) ?? { cierres: 0, reuniones: 0 };
    acc.reuniones += 1;
    if (r.cerro) acc.cierres += 1;
    closerMap.set(closerName, acc);
  }

  return {
    reuniones, asistieron, calificados, cierres, noCierres,
    showRate: safeDiv(asistieron, reuniones),
    closeRate: safeDiv(cierres, calificados),
    lossReasons: Array.from(lossMap.entries()).map(([reason, count]) => ({ reason, count })),
    byCloser: Array.from(closerMap.entries()).map(([closer, v]) => ({ closer, ...v })),
  };
}

// Zero-filled for every day in [since, until] — the activity timeline and
// KPI sparklines need real gaps to show as zero, not to be silently absent.
function buildDailySeries(adsRows: RawAdsRow[], closingRows: RawClosingRow[], since: string, until: string): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>();
  for (const fecha of eachDay(since, until)) byDay.set(fecha, { fecha, inversion: 0, leads: 0, reuniones: 0, cierres: 0 });

  for (const r of adsRows) {
    const acc = byDay.get(r.fecha);
    if (!acc) continue;
    acc.inversion += r.inversion ? parseFloat(String(r.inversion)) : 0;
    acc.leads += r.leads ?? 0;
  }
  for (const r of closingRows) {
    if (!r.fecha_llamada) continue;
    const day = r.fecha_llamada.slice(0, 10);
    const acc = byDay.get(day);
    if (!acc) continue;
    acc.reuniones += 1;
    if (r.cerro) acc.cierres += 1;
  }
  return Array.from(byDay.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Daily points as-is for short periods; bucketed into ISO weeks (Monday
// start) for longer ones, so a 90-day view doesn't render 90 x-axis ticks.
function buildPeriodTrend(daily: DailyPoint[], isShortPeriod: boolean): TrendPoint[] {
  if (isShortPeriod) {
    return daily.map((d) => ({ label: format(parseISO(d.fecha), 'dd/MM'), inversion: d.inversion, leads: d.leads, reuniones: d.reuniones, cierres: d.cierres }));
  }
  const byWeek = new Map<string, TrendPoint>();
  for (const d of daily) {
    const weekStart = format(startOfWeek(parseISO(d.fecha), { weekStartsOn: 1 }), 'dd/MM');
    const acc = byWeek.get(weekStart) ?? { label: weekStart, inversion: 0, leads: 0, reuniones: 0, cierres: 0 };
    acc.inversion += d.inversion;
    acc.leads += d.leads;
    acc.reuniones += d.reuniones;
    acc.cierres += d.cierres;
    byWeek.set(weekStart, acc);
  }
  return Array.from(byWeek.values());
}

function topCampaigns(adsRows: RawAdsRow[]): TopCampaign[] {
  const byName = new Map<string, { leads: number; inversion: number; ctrSum: number; rows: number }>();
  for (const r of adsRows) {
    const name = r.campaign_name ?? 'Sin nombre';
    const acc = byName.get(name) ?? { leads: 0, inversion: 0, ctrSum: 0, rows: 0 };
    acc.leads += r.leads ?? 0;
    acc.inversion += r.inversion ? parseFloat(String(r.inversion)) : 0;
    acc.ctrSum += r.ctr ? parseFloat(String(r.ctr)) : 0;
    acc.rows += 1;
    byName.set(name, acc);
  }
  return Array.from(byName.entries())
    .map(([nombre, v]) => ({ nombre, leads: v.leads, inversion: v.inversion, cpl: safeDiv(v.inversion, v.leads), ctr: v.rows > 0 ? v.ctrSum / v.rows : null }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 3);
}

async function fetchVslSummary(clientId: string, since: string, until: string): Promise<VslSummary | null> {
  const { data, error } = await supabase
    .from('vsl_events')
    .select('event_name, session_id, percent')
    .eq('client_id', clientId)
    .gte('created_at', since)
    .lte('created_at', until);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const sessions = new Set<string>();
  const playSessions = new Set<string>();
  const bookingSessions = new Set<string>();
  const abandonPercents: number[] = [];
  for (const e of data) {
    if (!e.session_id) continue;
    sessions.add(e.session_id);
    if (e.event_name === 'VSL_Play') playSessions.add(e.session_id);
    if (e.event_name === 'VSL_Form_Submit') bookingSessions.add(e.session_id);
    if (e.event_name === 'VSL_Abandon' && e.percent != null) abandonPercents.push(e.percent);
  }

  return {
    visitantesUnicos: sessions.size,
    playRate: safeDiv(playSessions.size, sessions.size),
    abandonoPromedio: abandonPercents.length ? abandonPercents.reduce((s, p) => s + p, 0) / abandonPercents.length : null,
    conversionBooking: safeDiv(bookingSessions.size, sessions.size),
  };
}

// Fixed 6-calendar-month lookback, independent of whatever period is
// selected on the dashboard — same idea as the Meta Ads DetailPanel trend
// chart being separate from the tab's own date range control.
async function fetchCpbcHistory(clientId: string): Promise<MonthlyCpbcPoint[]> {
  const months = Array.from({ length: 6 }, (_, i) => subMonths(startOfMonth(new Date()), 5 - i));
  const points: MonthlyCpbcPoint[] = [];
  for (const monthDate of months) {
    const since = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const until = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const [adsRows, closingRows] = await Promise.all([
      fetchAdsRows(clientId, since, until),
      fetchClosingRows(clientId, since, until),
    ]);
    const inversion = adsRows.reduce((s, r) => s + (r.inversion ? parseFloat(String(r.inversion)) : 0), 0);
    const reuniones = closingRows.length;
    points.push({ month: format(monthDate, 'MMM yyyy'), cpbc: safeDiv(inversion, reuniones) });
  }
  return points;
}

export async function fetchClientData(clientId: string, since: string, until: string, isShortPeriod: boolean): Promise<ClientDetailData> {
  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, country, renewal_risk, mrr, start_date')
    .eq('id', clientId)
    .single();
  if (clientErr) throw clientErr;

  const { data: phaseRow } = await supabase
    .from('delivery_phases')
    .select('fase, fecha_inicio')
    .eq('client_id', clientId)
    .is('fecha_fin', null)
    .maybeSingle();

  const client: ClientBase = {
    ...(clientRow as Omit<ClientBase, 'fase' | 'days_in_phase'>),
    fase: phaseRow ? (PHASE_LABELS[phaseRow.fase as keyof typeof PHASE_LABELS] ?? phaseRow.fase) : null,
    days_in_phase: phaseRow ? differenceInCalendarDays(new Date(), parseISO(phaseRow.fecha_inicio)) : null,
  };

  const { since: prevSince, until: prevUntil } = previousPeriodRange(since, until);

  const [adsRows, closingRows, prevAdsRows, prevClosingRows, vsl, cpbcHistory, revenueTotal] = await Promise.all([
    fetchAdsRows(clientId, since, until),
    fetchClosingRows(clientId, since, until),
    fetchAdsRows(clientId, prevSince, prevUntil),
    fetchClosingRows(clientId, prevSince, prevUntil),
    fetchVslSummary(clientId, since, until),
    fetchCpbcHistory(clientId),
    fetchClientRevenue(clientId, since, until),
  ]);

  const ads = summarizeAds(adsRows);
  const closing = summarizeClosing(closingRows);
  const revenue: RevenueMetrics = {
    hasData: true,
    revenue: revenueTotal,
    roi: safeDiv(revenueTotal, ads.inversion),
    cac: safeDiv(ads.inversion, closing.cierres),
  };
  const cpbc = safeDiv(ads.inversion, closing.reuniones);
  const dailySeries = buildDailySeries(adsRows, closingRows, since, until);

  const diasActivo = client.start_date ? differenceInCalendarDays(new Date(), parseISO(client.start_date)) : null;

  return {
    client,
    ads,
    closing,
    revenue,
    cpbc,
    prevPeriod: { ads: summarizeAds(prevAdsRows), closing: summarizeClosing(prevClosingRows) },
    dailySeries,
    periodTrend: buildPeriodTrend(dailySeries, isShortPeriod),
    cpbcHistory,
    // No reliable revenue source yet (see clientHealth.ts / fetchPortfolioData.ts
    // notes) — kept as an empty series rather than fabricated numbers.
    revenueHistory: [],
    topCampaigns: topCampaigns(adsRows),
    vsl,
    diasActivo,
  };
}
