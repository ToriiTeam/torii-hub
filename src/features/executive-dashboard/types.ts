import type { Income, Expense } from '@/features/finanzas/lib/types';
import type { ClientInstallmentRow } from '@/components/finanzas/types';
import type { ClientHealthRow } from './lib/businessHealth';

export interface ClientBase {
  id: string;
  name: string;
  country: string | null;
  fase: string | null;
  days_in_phase: number | null;
  renewal_risk: string | null;
  mrr: number | null;
  start_date: string | null;
  // How Torii itself acquired this client (not the client's own marketing
  // channel). Carried here so a future portfolio-wide ROAS calc can filter
  // to canal_captacion === 'Meta Ads' — never assume a client with no value
  // set came from ads.
  canal_captacion: string | null;
}

export interface AdsMetrics {
  inversion: number;
  impresiones: number;
  clics: number;
  leads: number;
  cpl: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
}

export interface ClosingMetrics {
  reuniones: number;
  asistieron: number;
  calificados: number;
  cierres: number;
  // se_presento=true AND cerro=false — distinct from (reuniones - cierres),
  // which would also include no-shows.
  noCierres: number;
  showRate: number | null;
  closeRate: number | null;
  lossReasons: { reason: string; count: number }[];
  byCloser: { closer: string; cierres: number; reuniones: number }[];
}

// Revenue has no reliable per-client source today (incomes.client_id is
// always null; client_closer_calls has no owner_type='client' rows yet) —
// hasData=false means "not measurable", not "zero revenue". Every metric
// derived from revenue (ROI, CAC-vs-revenue) follows the same rule.
export interface RevenueMetrics {
  hasData: boolean;
  revenue: number | null;
  roi: number | null;
  cac: number | null;
}

export type HealthStatus = 'excelente' | 'aceptable' | 'riesgo' | 'sin_datos';

export interface PortfolioClientRow {
  client: ClientBase;
  ads: AdsMetrics;
  closing: ClosingMetrics;
  revenue: RevenueMetrics;
  cpbc: number | null;
  health: HealthStatus;
}

export interface PortfolioData {
  rows: PortfolioClientRow[];
  totalMrr: number; // portfolio-wide, from incomes — not attributable per-client
  monthlyClosesTrend: { month: string; [clientName: string]: number | string }[];
}

// Shared shape for the period trend chart — `label` is a day (dd/MM) when
// the selected period is short (<=31 days) or a week-start date when it's
// longer, decided by PeriodRangeResult.isShortPeriod.
export interface TrendPoint { label: string; inversion: number; leads: number; reuniones: number; cierres: number; }
export interface DailyPoint { fecha: string; inversion: number; leads: number; reuniones: number; cierres: number; }
export interface MonthlyCpbcPoint { month: string; cpbc: number | null; }
export interface RevenuePoint { month: string; acumulado: number; }

export interface TopCampaign { nombre: string; leads: number; inversion: number; cpl: number | null; ctr: number | null; }

export interface VslSummary {
  visitantesUnicos: number;
  playRate: number | null;
  abandonoPromedio: number | null;
  conversionBooking: number | null;
}

export interface ClientDetailData {
  client: ClientBase;
  ads: AdsMetrics;
  closing: ClosingMetrics;
  revenue: RevenueMetrics;
  cpbc: number | null;
  // Previous period of equal length (not always "last calendar month" —
  // see periodRange.ts's previousPeriodRange).
  prevPeriod: { ads: AdsMetrics; closing: ClosingMetrics } | null;
  dailySeries: DailyPoint[]; // full selected period, one entry per day, zero-filled — feeds the activity timeline and KPI sparklines
  periodTrend: TrendPoint[]; // dailySeries as-is, or bucketed into weeks for longer periods — feeds the stacked area chart
  cpbcHistory: MonthlyCpbcPoint[]; // fixed 6-calendar-month lookback, independent of the selected period
  revenueHistory: RevenuePoint[];
  topCampaigns: TopCampaign[];
  vsl: VslSummary | null; // null when the client has no vsl_events at all
  diasActivo: number | null;
}

// The agency's own view — not a "client" in `clients`, so this pulls from
// the parts of each table that are explicitly NOT client-scoped:
// owner_type='torii' calls, ads_campanas.client_id IS NULL, and unfiltered
// incomes/expenses. Reuses PortfolioData for the "health overview" table
// (same comparative view shown under "Todos los clientes").
export interface ToriiData {
  closing: ClosingMetrics; // already excludes fuente='LinkedIn' rows — see fetchToriiData.ts
  ads: AdsMetrics;
  incomesTotal: number; // unfiltered — includes capital contributions, unlike portfolioMrr
  expensesTotal: number;
  netProfit: number;
  portfolioMrr: number;
  portfolio: PortfolioData;
  // count(client_closer_calls) where owner_type='torii', fuente='ADS',
  // se_presento=true, califico=true — denominator for "Costo por llamada
  // calificada".
  qualifiedAdsCalls: number;
  // count(client_closer_calls) where owner_type='torii', fuente='ADS',
  // cerro=true — CAC's denominator ("clientes cerrados vía ADS").
  closedViaAds: number;

  // Raw period-scoped rows for the "Salud del Negocio" block — kept as full
  // arrays (not pre-aggregated) so businessHealth.ts / financeCalc.ts can
  // apply their own status/type/category filters, same "fetch once,
  // compute client-side" pattern as Finanzas.
  healthIncomes: Income[];
  healthExpenses: Expense[];
  healthClients: ClientHealthRow[];
  healthInstallments: ClientInstallmentRow[];
  healthReservas: number;
}
