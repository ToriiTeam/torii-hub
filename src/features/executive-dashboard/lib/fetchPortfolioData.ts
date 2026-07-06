import { supabase } from '@/integrations/supabase/client';
import { subMonths, format, startOfMonth, differenceInCalendarDays, parseISO } from 'date-fns';
import { safeDiv, computeHealth } from './clientHealth';
import { PHASE_LABELS } from '@/features/delivery-os/types';
import type { AdsMetrics, ClientBase, ClosingMetrics, PortfolioClientRow, PortfolioData, RevenueMetrics } from '../types';

const EMPTY_ADS: AdsMetrics = { inversion: 0, impresiones: 0, clics: 0, leads: 0, cpl: null, ctr: null, cpm: null, cpc: null };
const EMPTY_CLOSING: ClosingMetrics = { reuniones: 0, asistieron: 0, calificados: 0, cierres: 0, showRate: null, closeRate: null, lossReasons: [], byCloser: [] };
// hasData=false everywhere — see the null-safety note: no client has a
// reliable revenue source today (incomes.client_id is always null,
// client_closer_calls has zero owner_type='client' rows).
const NO_REVENUE: RevenueMetrics = { hasData: false, revenue: null, roi: null, cac: null };

async function fetchClients(): Promise<ClientBase[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, country, renewal_risk, mrr, start_date')
    .order('name');
  if (error) throw error;
  const clients = data ?? [];

  const { data: phases, error: phaseErr } = await supabase
    .from('delivery_phases')
    .select('client_id, fase, fecha_inicio')
    .is('fecha_fin', null);
  if (phaseErr) throw phaseErr;

  const phaseByClient = new Map((phases ?? []).map((p) => [p.client_id, p]));

  return clients.map((c) => {
    const phase = phaseByClient.get(c.id);
    return {
      ...c,
      fase: phase ? (PHASE_LABELS[phase.fase as keyof typeof PHASE_LABELS] ?? phase.fase) : null,
      days_in_phase: phase ? differenceInCalendarDays(new Date(), parseISO(phase.fecha_inicio)) : null,
    };
  });
}

async function fetchAdsByClient(since: string, until: string): Promise<Map<string, AdsMetrics>> {
  const { data, error } = await supabase
    .from('ads_metricas_diarias')
    .select('inversion, impresiones, clics, leads, ctr, cpm, cpc, ads_campanas!inner(client_id)')
    .gte('fecha', since)
    .lte('fecha', until);
  if (error) throw error;

  const byClient = new Map<string, { inversion: number; impresiones: number; clics: number; leads: number; ctrSum: number; cpmSum: number; cpcSum: number; rows: number }>();
  for (const row of data ?? []) {
    const clientId = (row.ads_campanas as unknown as { client_id: string | null })?.client_id;
    if (!clientId) continue;
    const acc = byClient.get(clientId) ?? { inversion: 0, impresiones: 0, clics: 0, leads: 0, ctrSum: 0, cpmSum: 0, cpcSum: 0, rows: 0 };
    acc.inversion += row.inversion ? parseFloat(String(row.inversion)) : 0;
    acc.impresiones += row.impresiones ?? 0;
    acc.clics += row.clics ?? 0;
    acc.leads += row.leads ?? 0;
    acc.ctrSum += row.ctr ? parseFloat(String(row.ctr)) : 0;
    acc.cpmSum += row.cpm ? parseFloat(String(row.cpm)) : 0;
    acc.cpcSum += row.cpc ? parseFloat(String(row.cpc)) : 0;
    acc.rows += 1;
    byClient.set(clientId, acc);
  }

  const result = new Map<string, AdsMetrics>();
  for (const [clientId, acc] of byClient.entries()) {
    result.set(clientId, {
      inversion: acc.inversion,
      impresiones: acc.impresiones,
      clics: acc.clics,
      leads: acc.leads,
      cpl: safeDiv(acc.inversion, acc.leads),
      ctr: acc.rows > 0 ? acc.ctrSum / acc.rows : null,
      cpm: acc.rows > 0 ? acc.cpmSum / acc.rows : null,
      cpc: acc.rows > 0 ? acc.cpcSum / acc.rows : null,
    });
  }
  return result;
}

async function fetchClosingByClient(since: string, until: string): Promise<Map<string, ClosingMetrics>> {
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('client_id, se_presento, califico, cerro, closer, loss_reason')
    .eq('owner_type', 'client')
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);
  if (error) throw error;

  const byClient = new Map<string, { reuniones: number; asistieron: number; calificados: number; cierres: number; lossReasons: Map<string, number>; closers: Map<string, { cierres: number; reuniones: number }> }>();
  for (const row of data ?? []) {
    if (!row.client_id) continue;
    const acc = byClient.get(row.client_id) ?? { reuniones: 0, asistieron: 0, calificados: 0, cierres: 0, lossReasons: new Map(), closers: new Map() };
    acc.reuniones += 1;
    if (row.se_presento) acc.asistieron += 1;
    if (row.califico) acc.calificados += 1;
    if (row.cerro) acc.cierres += 1;
    if (!row.cerro && row.loss_reason) acc.lossReasons.set(row.loss_reason, (acc.lossReasons.get(row.loss_reason) ?? 0) + 1);
    const closerName = row.closer ?? 'Sin asignar';
    const closerAcc = acc.closers.get(closerName) ?? { cierres: 0, reuniones: 0 };
    closerAcc.reuniones += 1;
    if (row.cerro) closerAcc.cierres += 1;
    acc.closers.set(closerName, closerAcc);
    byClient.set(row.client_id, acc);
  }

  const result = new Map<string, ClosingMetrics>();
  for (const [clientId, acc] of byClient.entries()) {
    result.set(clientId, {
      reuniones: acc.reuniones,
      asistieron: acc.asistieron,
      calificados: acc.calificados,
      cierres: acc.cierres,
      showRate: safeDiv(acc.asistieron, acc.reuniones),
      closeRate: safeDiv(acc.cierres, acc.calificados),
      lossReasons: Array.from(acc.lossReasons.entries()).map(([reason, count]) => ({ reason, count })),
      byCloser: Array.from(acc.closers.entries()).map(([closer, v]) => ({ closer, ...v })),
    });
  }
  return result;
}

async function fetchPortfolioMrr(since: string, until: string): Promise<number> {
  const { data, error } = await supabase
    .from('incomes')
    .select('amount, type')
    .gte('date', since)
    .lte('date', until)
    .neq('type', 'Aporte de capital');
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + (r.amount ? parseFloat(String(r.amount)) : 0), 0);
}

// Last 6 months of closes per client, for the trend line chart — one query
// per month kept simple (6 small queries) rather than a single wide range
// query with client-side month bucketing, since client_closer_calls has no
// month column to group by server-side anyway.
async function fetchClosesTrend(clients: ClientBase[]): Promise<PortfolioData['monthlyClosesTrend']> {
  const months = Array.from({ length: 6 }, (_, i) => subMonths(startOfMonth(new Date()), 5 - i));
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('client_id, fecha_llamada, cerro')
    .eq('owner_type', 'client')
    .eq('cerro', true)
    .gte('fecha_llamada', format(months[0], 'yyyy-MM-dd'));
  if (error) throw error;

  return months.map((monthDate) => {
    const monthKey = format(monthDate, 'yyyy-MM');
    const point: PortfolioData['monthlyClosesTrend'][number] = { month: format(monthDate, 'MMM yyyy') };
    for (const client of clients) point[client.name] = 0;
    for (const row of data ?? []) {
      if (!row.client_id || !row.fecha_llamada) continue;
      if (!row.fecha_llamada.startsWith(monthKey)) continue;
      const name = clientNameById.get(row.client_id);
      if (name) point[name] = (Number(point[name]) || 0) + 1;
    }
    return point;
  });
}

export async function fetchPortfolioData(since: string, until: string): Promise<PortfolioData> {
  const clients = await fetchClients();
  const [adsByClient, closingByClient, totalMrr, monthlyClosesTrend] = await Promise.all([
    fetchAdsByClient(since, until),
    fetchClosingByClient(since, until),
    fetchPortfolioMrr(since, until),
    fetchClosesTrend(clients),
  ]);

  const rows: PortfolioClientRow[] = clients.map((client) => {
    const ads = adsByClient.get(client.id) ?? EMPTY_ADS;
    const closing = closingByClient.get(client.id) ?? EMPTY_CLOSING;
    const revenue = NO_REVENUE;
    const cpbc = safeDiv(ads.inversion, closing.reuniones);
    return { client, ads, closing, revenue, cpbc, health: computeHealth(revenue) };
  });

  return { rows, totalMrr, monthlyClosesTrend };
}
