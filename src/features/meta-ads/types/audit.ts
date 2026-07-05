export type AuditSeverity = 'critical' | 'warning' | 'opportunity' | 'info'

export interface AuditRecommendation {
  id: string
  severity: AuditSeverity
  entityId: string
  entityName: string
  entityLevel: 'campaign' | 'adset' | 'ad'
  title: string
  description: string
  action: string
  metric?: string
  metricValue?: number
}

export type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical'

export interface HealthSummary {
  excellent: number
  good: number
  warning: number
  critical: number
  total: number
}

// Thresholds that don't vary by market — ROAS is left in for accounts that
// do run purchase-optimized campaigns (extractRoas() is 0 for pure lead-gen,
// so these branches are inert there), plus the two rules untouched by the
// per-market rework below.
export const AUDIT_THRESHOLDS = {
  ROAS_CRITICAL: 1.0,
  ROAS_WARNING: 2.0,
  ROAS_GOOD: 3.0,
  ROAS_EXCELLENT: 4.0,
  CTR_GOOD: 2.0,
  CTR_EXCELLENT: 3.5,
  SPEND_NO_CONVERSION_WARNING: 300,
  SPEND_NO_CONVERSION_CRITICAL: 800,
  BUDGET_CONCENTRATION_WARNING: 0.5,
  BUDGET_CONCENTRATION_CRITICAL: 0.7,
} as const

// Which pricing/benchmark market a client's ad account belongs to — decided
// by AccountContext matching the Meta account name against clients.country.
export type Market = 'latam' | 'spain'

export interface MarketThresholds {
  CPM_WARNING: number
  CPM_CRITICAL: number
  CPC_WARNING: number
  CPC_CRITICAL: number
  CPL_WARNING: number
  CPL_CRITICAL: number
  CTR_CRITICAL: number
  FREQUENCY_WATCH: number
  FREQUENCY_WARNING: number
  FREQUENCY_CRITICAL: number
  MIN_SPEND_FOR_DIAGNOSIS: number
}

export const LATAM_THRESHOLDS: MarketThresholds = {
  CPM_WARNING: 15, CPM_CRITICAL: 20,
  CPC_WARNING: 1.0, CPC_CRITICAL: 1.5,
  CPL_WARNING: 20, CPL_CRITICAL: 30,
  CTR_CRITICAL: 0.8,
  FREQUENCY_WATCH: 2.5, FREQUENCY_WARNING: 3.0, FREQUENCY_CRITICAL: 4.5,
  MIN_SPEND_FOR_DIAGNOSIS: 15,
}

export const SPAIN_THRESHOLDS: MarketThresholds = {
  CPM_WARNING: 30, CPM_CRITICAL: 40,
  CPC_WARNING: 2.0, CPC_CRITICAL: 3.0,
  CPL_WARNING: 40, CPL_CRITICAL: 60,
  CTR_CRITICAL: 0.8,
  FREQUENCY_WATCH: 2.5, FREQUENCY_WARNING: 3.0, FREQUENCY_CRITICAL: 4.5,
  MIN_SPEND_FOR_DIAGNOSIS: 15,
}

export function getMarketThresholds(market: Market): MarketThresholds {
  return market === 'spain' ? SPAIN_THRESHOLDS : LATAM_THRESHOLDS
}
