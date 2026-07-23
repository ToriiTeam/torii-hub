import { supabase } from '@/integrations/supabase/client';
import { summarizeAds, summarizeClosing, type RawAdsRow, type RawClosingRow } from './fetchClientData';
import { fetchVslFunnelData, type VslFunnelData } from './fetchVslFunnel';
import type { VslFunnelMetrics } from '../types';

// Lean, auditor-only counterpart to fetchToriiData.ts — deliberately does
// NOT reuse it. fetchToriiData() also pulls clients/incomes/expenses/
// client_installments/delivery_phases for the Resumen tab's other cards,
// none of which the VSL Funnel needs or the auditor role is scoped to see
// (see 20260724120000_auditor_scope_closing_and_lockdown.sql). Querying
// only what's actually used is defense in depth on top of that RLS —
// the auditor's browser never even asks for the rest.

interface RawToriiCall extends RawClosingRow {
  fuente: string | null;
  utm_source: string | null;
}

function fuenteOf(row: { fuente: string | null; utm_source: string | null }): string {
  return row.fuente || row.utm_source || 'Sin fuente';
}

async function fetchAdsRows(since: string, until: string): Promise<RawAdsRow[]> {
  // Same query fetchToriiData.ts uses (Torii's own house accounts, client_id
  // IS NULL) — RLS narrows the result to LM Social Constructions only for
  // the auditor, so no extra filter is needed here.
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

async function fetchTorriCalls(since: string, until: string): Promise<RawToriiCall[]> {
  // RLS scopes this to owner_type='torii' for the auditor regardless, but
  // filtering explicitly too keeps the query's intent self-evident.
  const { data, error } = await supabase
    .from('client_closer_calls')
    .select('fecha_llamada, se_presento, califico, cerro, closer, loss_reason, fuente, utm_source')
    .eq('owner_type', 'torii')
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);
  if (error) throw error;
  return data ?? [];
}

export interface AuditorVslFunnelResult {
  metrics: VslFunnelMetrics;
  vslFunnelData: VslFunnelData;
}

export async function fetchAuditorVslFunnelData(since: string, until: string): Promise<AuditorVslFunnelResult> {
  const [adsRows, callRows, vslFunnelData] = await Promise.all([
    fetchAdsRows(since, until),
    fetchTorriCalls(since, until),
    fetchVslFunnelData(since, until),
  ]);

  // Same definition as fetchToriiData.ts's qualifiedAdsCalls — denominator
  // for CPBC (calcCostoPorLlamadaCalificada).
  const qualifiedAdsCalls = callRows.filter((r) => fuenteOf(r) === 'ADS' && r.se_presento && r.califico).length;

  return {
    metrics: {
      ads: summarizeAds(adsRows),
      closing: summarizeClosing(callRows),
      qualifiedAdsCalls,
    },
    vslFunnelData,
  };
}
