import type { TimeseriesInsightRow } from '../types/meta'
import { extractPurchases, extractCostPerPurchase, extractRoas, extractPurchaseValue } from '../types/meta'

export interface MetricConfig {
  key: string
  label: string
  group: string
  getValue: (row: TimeseriesInsightRow) => number
  format: (value: number, currency: string) => string
  color: string
}

function formatCurrency(value: number, currency: string): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-MX')
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`
}

export const METRIC_OPTIONS: MetricConfig[] = [
  {
    key: 'spend', label: 'Gasto', group: 'Gasto y Eficiencia',
    getValue: (row) => parseFloat(row.spend) || 0,
    format: formatCurrency, color: 'var(--accent-blue)',
  },
  {
    key: 'cpc', label: 'CPC', group: 'Gasto y Eficiencia',
    getValue: (row) => parseFloat(row.cpc) || 0,
    format: formatCurrency, color: 'var(--accent-purple)',
  },
  {
    key: 'cpm', label: 'CPM', group: 'Gasto y Eficiencia',
    getValue: (row) => parseFloat(row.cpm) || 0,
    format: formatCurrency, color: 'var(--accent-yellow)',
  },
  {
    key: 'impressions', label: 'Impresiones', group: 'Volumen',
    getValue: (row) => parseFloat(row.impressions) || 0,
    format: (_v, _c) => formatNumber(_v), color: 'var(--accent-blue)',
  },
  {
    key: 'reach', label: 'Alcance', group: 'Volumen',
    getValue: (row) => parseFloat(row.reach) || 0,
    format: (_v, _c) => formatNumber(_v), color: '#60a5fa',
  },
  {
    key: 'clicks', label: 'Clicks', group: 'Volumen',
    getValue: (row) => parseFloat(row.clicks) || 0,
    format: (_v, _c) => formatNumber(_v), color: 'var(--accent-purple)',
  },
  {
    key: 'ctr', label: 'CTR', group: 'Tasas',
    getValue: (row) => parseFloat(row.ctr) || 0,
    format: (_v, _c) => formatPercent(_v), color: 'var(--accent-green)',
  },
  {
    key: 'frequency', label: 'Frecuencia', group: 'Tasas',
    getValue: (row) => parseFloat(row.frequency) || 0,
    format: (_v, _c) => _v.toFixed(2), color: 'var(--accent-yellow)',
  },
  {
    key: 'purchases', label: 'Compras', group: 'Conversiones',
    getValue: (row) => extractPurchases(row),
    format: (_v, _c) => formatNumber(_v), color: 'var(--accent-green)',
  },
  {
    key: 'purchase_value', label: 'Valor de Compras', group: 'Conversiones',
    getValue: (row) => extractPurchaseValue(row),
    format: formatCurrency, color: 'var(--accent-green)',
  },
  {
    key: 'cost_per_purchase', label: 'Costo/Compra', group: 'Conversiones',
    getValue: (row) => extractCostPerPurchase(row),
    format: formatCurrency, color: 'var(--accent-red)',
  },
  {
    key: 'roas', label: 'ROAS', group: 'Conversiones',
    getValue: (row) => extractRoas(row),
    format: (_v, _c) => formatMultiplier(_v), color: 'var(--accent-green)',
  },
]

export function getMetricConfig(key: string): MetricConfig {
  return METRIC_OPTIONS.find((m) => m.key === key) || METRIC_OPTIONS[0]
}

export const METRIC_GROUPS = [...new Set(METRIC_OPTIONS.map((m) => m.group))]
