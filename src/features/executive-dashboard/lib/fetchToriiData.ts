import { supabase } from '@/integrations/supabase/client';
import { summarizeAds, summarizeClosing, type RawAdsRow, type RawClosingRow } from './fetchClientData';
import { fetchPortfolioData } from './fetchPortfolioData';
import type { ToriiData } from '../types';

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

async function fetchToriiClosingRows(since: string, until: string): Promise<RawClosingRow[]> {
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('fecha_llamada, se_presento, califico, cerro, closer, loss_reason')
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

export async function fetchToriiData(since: string, until: string): Promise<ToriiData> {
  const [adsRows, closingRows, { incomesTotal, expensesTotal }, portfolio] = await Promise.all([
    fetchToriiAdsRows(since, until),
    fetchToriiClosingRows(since, until),
    fetchGlobalFinancials(since, until),
    fetchPortfolioData(since, until),
  ]);

  return {
    ads: summarizeAds(adsRows),
    closing: summarizeClosing(closingRows),
    incomesTotal,
    expensesTotal,
    netProfit: incomesTotal - expensesTotal,
    portfolioMrr: portfolio.totalMrr,
    portfolio,
  };
}
