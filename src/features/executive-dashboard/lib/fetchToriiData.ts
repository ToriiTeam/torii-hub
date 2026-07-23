import { supabase } from '@/integrations/supabase/client';
import { summarizeAds, summarizeClosing, type RawAdsRow, type RawClosingRow } from './fetchClientData';
import { fetchPortfolioData } from './fetchPortfolioData';
import type { ClientHealthRow } from './businessHealth';
import type { ToriiData } from '../types';
import type { Income, Expense } from '@/features/finanzas/lib/types';
import type { ClientInstallmentRow } from '@/components/finanzas/types';

interface RawToriiCall extends RawClosingRow {
  fuente: string | null;
  utm_source: string | null;
  precio: number | null;
}

// Same convention Closers.tsx's own fuenteOf() uses — kept as a separate
// copy here rather than importing from a page file.
function fuenteOf(row: { fuente: string | null; utm_source: string | null }): string {
  return row.fuente || row.utm_source || 'Sin fuente';
}

async function fetchToriiAdsRows(since: string, until: string): Promise<RawAdsRow[]> {
  // Torii's own house accounts (Benjamin Rivero, LM Social Constructions,
  // etc. — same accounts hardcoded in meta-ads/context/AccountContext.tsx)
  // are synced with client_id left NULL in ads_campanas, same convention
  // syncMetaToSupabase.ts already uses to distinguish them from client spend.
  const { data, error } = await supabase
    .from('ads_metricas_diarias')
    .select('fecha, inversion, impresiones, clics, leads, ctr, cpm, cpc, ads_campanas!inner(client_id, nombre)')
    .is('ads_campanas.client_id', null)
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

async function fetchToriiCalls(since: string, until: string): Promise<RawToriiCall[]> {
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('fecha_llamada, se_presento, califico, cerro, closer, loss_reason, fuente, utm_source, precio')
    .eq('owner_type', 'torii')
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);
  if (error) throw error;
  return data ?? [];
}

async function fetchGlobalFinancials(since: string, until: string): Promise<{ incomesTotal: number; expensesTotal: number }> {
  const [incomesRes, expensesRes] = await Promise.all([
    supabase.from('incomes').select('amount').gte('date', since).lte('date', until),
    // Sanity floor on date: one legacy expenses row has a data-entry typo
    // (year 0026 instead of 2026) that would otherwise skew nothing here
    // since we're already bounding by `since`, but kept explicit in case a
    // future "all time" total ever reuses this function without a range.
    supabase.from('expenses').select('amount').gte('date', since).lte('date', until),
  ]);
  if (incomesRes.error) throw incomesRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const incomesTotal = (incomesRes.data ?? []).reduce((s, r) => s + (r.amount ? parseFloat(String(r.amount)) : 0), 0);
  const expensesTotal = (expensesRes.data ?? []).reduce((s, r) => s + (r.amount ? parseFloat(String(r.amount)) : 0), 0);
  return { incomesTotal, expensesTotal };
}

// Full raw rows for "Salud del Negocio" — deliberately separate from
// fetchGlobalFinancials() above, which only needs sums for the existing
// "Ingresos/Egresos totales" cards (and doesn't filter by status/type, by
// original design — see ToriiData.incomesTotal's comment). These calcs
// need the actual rows so financeCalc.ts's Paid/type-aware filters apply.
// Note: clients here are NOT filtered by clients.oferta or any categorical
// field — the "Nuevo Torii" toggle is a single date floor applied via the
// (since, until) this function receives, nothing else (see
// ExecutiveDashboard.tsx's clampToNuevoTorii, the one and only mechanism).
async function fetchBusinessHealthInputs(since: string, until: string): Promise<{
  incomes: Income[];
  expenses: Expense[];
  clients: ClientHealthRow[];
  installments: ClientInstallmentRow[];
  reservas: number;
}> {
  const [incomesRes, expensesRes, clientsRes, installmentsRes, callsRes] = await Promise.all([
    supabase.from('incomes').select('*').gte('date', since).lte('date', until),
    supabase.from('expenses').select('*').gte('date', since).lte('date', until),
    supabase.from('clients').select('id, start_date, status, fecha_cancelacion, canal_captacion'),
    supabase.from('client_installments').select('*'),
    // Reservas = every booked call in the period, regardless of funnel
    // (Torii's own or a client's) — Adquisición spend isn't split by funnel.
    supabase.from('client_closer_calls').select('id', { count: 'exact', head: true }).gte('fecha_llamada', since).lte('fecha_llamada', until),
  ]);
  if (incomesRes.error) throw incomesRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (clientsRes.error) throw clientsRes.error;
  if (installmentsRes.error) throw installmentsRes.error;
  if (callsRes.error) throw callsRes.error;

  return {
    incomes: incomesRes.data ?? [],
    expenses: expensesRes.data ?? [],
    clients: clientsRes.data ?? [],
    installments: installmentsRes.data ?? [],
    reservas: callsRes.count ?? 0,
  };
}

// Single (since, until) applies identically to every query here — the
// caller (ExecutiveDashboard.tsx) is responsible for clamping it to
// NUEVO_TORII_SINCE before calling this when the toggle is ON. nuevoToriiOnly
// only gates ONE extra filter on top of that date floor: fuente !=
// 'LinkedIn' on Torii's own closing-funnel cards (Reuniones, Show rate,
// Calificados, Close rate, Cierres, Revenue de Torii) and the ADS-specific
// denominators for CAC/Costo por llamada calificada — LinkedIn outbound
// calls are the old funnel, kept in the raw data but excluded from these
// when the toggle is ON. OFF means every one of these behaves exactly like
// before "Nuevo Torii" existed (unfiltered by fuente).
export async function fetchToriiData(since: string, until: string, nuevoToriiOnly: boolean = false): Promise<ToriiData> {
  const [adsRows, callRows, { incomesTotal, expensesTotal }, portfolio, health] = await Promise.all([
    fetchToriiAdsRows(since, until),
    fetchToriiCalls(since, until),
    fetchGlobalFinancials(since, until),
    fetchPortfolioData(since, until),
    fetchBusinessHealthInputs(since, until),
  ]);

  const funnelRows = nuevoToriiOnly ? callRows.filter((r) => fuenteOf(r) !== 'LinkedIn') : callRows;
  const toriiRevenue = funnelRows
    .filter((r) => r.cerro)
    .reduce((s, r) => s + (r.precio ? parseFloat(String(r.precio)) : 0), 0);
  // Denominators for "Costo por llamada calificada" and CAC (Nuevo Torii
  // only) — scoped to fuente='ADS' specifically (not just != 'LinkedIn').
  const qualifiedAdsCalls = callRows.filter((r) => fuenteOf(r) === 'ADS' && r.se_presento && r.califico).length;
  const closedViaAds = callRows.filter((r) => fuenteOf(r) === 'ADS' && r.cerro).length;

  return {
    ads: summarizeAds(adsRows),
    closing: summarizeClosing(funnelRows),
    qualifiedAdsCalls,
    closedViaAds,
    incomesTotal,
    expensesTotal,
    netProfit: incomesTotal - expensesTotal,
    portfolioMrr: toriiRevenue,
    portfolio,
    healthIncomes: health.incomes,
    healthExpenses: health.expenses,
    healthClients: health.clients,
    healthInstallments: health.installments,
    healthReservas: health.reservas,
  };
}
