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

export const AUDIT_THRESHOLDS = {
  ROAS_CRITICAL: 1.0,
  ROAS_WARNING: 2.0,
  ROAS_GOOD: 3.0,
  ROAS_EXCELLENT: 4.0,
  CTR_CRITICAL: 0.5,
  CTR_LOW: 1.0,
  CTR_GOOD: 2.0,
  CTR_EXCELLENT: 3.5,
  FREQUENCY_WARNING: 3.0,
  FREQUENCY_CRITICAL: 4.5,
  CPM_HIGH: 80,
  CPM_VERY_HIGH: 120,
  CPC_HIGH_MULTIPLIER: 2.0,
  SPEND_NO_CONVERSION_WARNING: 300,
  SPEND_NO_CONVERSION_CRITICAL: 800,
  BUDGET_CONCENTRATION_WARNING: 0.5,
  BUDGET_CONCENTRATION_CRITICAL: 0.7,
  SCALE_MIN_SPEND: 100,
} as const
