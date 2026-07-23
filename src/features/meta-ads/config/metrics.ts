import type { TimeseriesInsightRow } from '../types/meta'
import { extractPurchases, extractCostPerPurchase, extractRoas, extractPurchaseValue, extractLinkClicks } from '../types/meta'

export type MetricFormat = 'currency' | 'number' | 'compact' | 'percent' | 'roas'

export interface MetricConfig {
  key: string
  label: string
  group: string
  getValue: (row: TimeseriesInsightRow) => number
  format: MetricFormat
  color: string
}

export const METRIC_OPTIONS: MetricConfig[] = [
  {
    key: 'spend', label: 'Gasto', group: 'Gasto y Eficiencia',
    getValue: (row) => parseFloat(row.spend) || 0,
    format: 'currency', color: 'var(--accent-blue)',
  },
  {
    key: 'cpc', label: 'CPC', group: 'Gasto y Eficiencia',
    getValue: (row) => parseFloat(row.cpc) || 0,
    format: 'currency', color: 'var(--accent-purple)',
  },
  {
    key: 'cpm', label: 'CPM', group: 'Gasto y Eficiencia',
    getValue: (row) => parseFloat(row.cpm) || 0,
    format: 'currency', color: 'var(--accent-yellow)',
  },
  {
    key: 'impressions', label: 'Impresiones', group: 'Volumen',
    getValue: (row) => parseFloat(row.impressions) || 0,
    format: 'number', color: 'var(--accent-blue)',
  },
  {
    key: 'reach', label: 'Alcance', group: 'Volumen',
    getValue: (row) => parseFloat(row.reach) || 0,
    format: 'number', color: '#60a5fa',
  },
  {
    key: 'clicks', label: 'Clicks', group: 'Volumen',
    getValue: (row) => extractLinkClicks(row),
    format: 'number', color: 'var(--accent-purple)',
  },
  {
    key: 'ctr', label: 'CTR', group: 'Tasas',
    getValue: (row) => parseFloat(row.ctr) || 0,
    format: 'percent', color: 'var(--accent-green)',
  },
  {
    key: 'frequency', label: 'Frecuencia', group: 'Tasas',
    getValue: (row) => parseFloat(row.frequency) || 0,
    format: 'number', color: 'var(--accent-yellow)',
  },
  {
    key: 'purchases', label: 'Compras', group: 'Conversiones',
    getValue: (row) => extractPurchases(row),
    format: 'number', color: 'var(--accent-green)',
  },
  {
    key: 'purchase_value', label: 'Valor de Compras', group: 'Conversiones',
    getValue: (row) => extractPurchaseValue(row),
    format: 'currency', color: 'var(--accent-green)',
  },
  {
    key: 'cost_per_purchase', label: 'Costo/Compra', group: 'Conversiones',
    getValue: (row) => extractCostPerPurchase(row),
    format: 'currency', color: 'var(--accent-red)',
  },
  {
    key: 'roas', label: 'ROAS', group: 'Conversiones',
    getValue: (row) => extractRoas(row),
    format: 'roas', color: 'var(--accent-green)',
  },
]

export function getMetricConfig(key: string): MetricConfig {
  return METRIC_OPTIONS.find((m) => m.key === key) || METRIC_OPTIONS[0]
}

export const METRIC_GROUPS = [...new Set(METRIC_OPTIONS.map((m) => m.group))]
