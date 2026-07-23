import { useState, useMemo } from 'react'
import { useAccount } from '../../context/AccountContext'
import { useDateRange } from '../../context/DateRangeContext'
import { getMetricConfig, METRIC_OPTIONS } from '../../config/metrics'
import { MetricCard } from '../common/MetricCard'
import { MetricSelector } from '../detail/MetricSelector'
import { SkeletonMetrics } from '../common/SkeletonLoader'
import { TimeseriesChart } from '../detail/TimeseriesChart'
import { useTimeseries } from '../../hooks/useTimeseries'
import { useMetaApi } from '../../hooks/useMetaApi'
import { aggregateRows } from '../../lib/aggregateRows'
import { previousPeriod } from '../../lib/dateRange'
import { extractResultado, extractCostoPorResultado, extractLinkClicks } from '../../types/meta'
import type { InsightRow } from '../../types/meta'

// 'resultados'/'costo_resultado' aren't in METRIC_OPTIONS (see metrics.ts)
// so these two branches are currently unreachable — kept in case they're
// ever added there, same as they were before this rename (previously
// 'leads'/'cpl', equally unreachable).
function extractValue(row: InsightRow, key: string): number {
  if (key === 'resultados')      return extractResultado(row)
  if (key === 'costo_resultado') return extractCostoPorResultado(row) ?? 0
  if (key === 'clicks')          return extractLinkClicks(row)
  const v = (row as Record<string, unknown>)[key]
  if (typeof v === 'string') return parseFloat(v) || 0
  if (typeof v === 'number') return v
  return 0
}

export function MetricsBar() {
  const { selectedAccount } = useAccount()
  const { compareMode, datePreset, customRange, buildParams } = useDateRange()
  const [trendMetric, setTrendMetric] = useState('spend')

  const compare = compareMode === 'previous' ? 'previous' : undefined

  // Trend chart keeps reading the daily account-level timeseries.
  const timeseriesResult = useTimeseries(
    selectedAccount?.account_id ?? null,
    'account',
    null,
    compare,
  )

  // KPI totals are summed from the campaigns endpoint instead — the
  // account-level /insights call returns 0 rows for some accounts, while
  // per-campaign data (used by CampaignsTab) loads correctly.
  const campaignsEndpoint = selectedAccount
    ? `/accounts/${selectedAccount.account_id}/campaigns?${buildParams()}`
    : ''
  const { data: campaigns, loading: campaignsLoading } =
    useMetaApi<InsightRow[]>(campaignsEndpoint, !!selectedAccount)

  const prevRange = useMemo(
    () => previousPeriod(datePreset, customRange),
    [datePreset, customRange],
  )
  const comparingPrevious = !!selectedAccount && compareMode === 'previous'
  const prevCampaignsEndpoint = comparingPrevious
    ? `/accounts/${selectedAccount.account_id}/campaigns?since=${prevRange.since}&until=${prevRange.until}`
    : ''
  const { data: prevCampaigns, loading: prevCampaignsLoading } =
    useMetaApi<InsightRow[]>(prevCampaignsEndpoint, comparingPrevious)

  const current  = useMemo(() => aggregateRows(campaigns ?? []),     [campaigns])
  const previous = useMemo(() => aggregateRows(prevCampaigns ?? []), [prevCampaigns])

  const metrics = useMemo(
    () => METRIC_OPTIONS.filter(m => m.key !== 'roas').slice(0, 8),
    [],
  )

  if (!selectedAccount) {
    return <div className="metrics-bar-empty">Seleccioná una cuenta para ver métricas.</div>
  }

  if (campaignsLoading || (comparingPrevious && prevCampaignsLoading)) {
    return (
      <div className="metrics-bar-section">
        <SkeletonMetrics />
      </div>
    )
  }

  return (
    <div className="metrics-bar-section">
      <div className="metrics-bar-grid">
        {metrics.map(m => {
          const config   = getMetricConfig(m.key)
          const currVal  = current  ? extractValue(current,  m.key) : 0
          const prevVal  = previous ? extractValue(previous, m.key) : undefined

          return (
            <MetricCard
              key={m.key}
              label={m.label}
              value={currVal}
              format={config?.format as 'currency' | 'number' | 'compact' | 'percent' | 'roas' ?? 'number'}
              sensitive={['spend', 'cpl', 'cpc', 'cpm'].includes(m.key)}
              previousValue={compareMode === 'previous' ? (prevVal ?? null) : null}
              invertTrend={config?.invertTrend}
              sparklineData={timeseriesResult.data.map(row => extractValue(row as unknown as InsightRow, m.key))}
            />
          )
        })}
      </div>

      <div className="metrics-bar-trend">
        <div className="metrics-bar-trend-header">
          <h3 className="metrics-bar-trend-title">Tendencia</h3>
          <MetricSelector value={trendMetric} onChange={setTrendMetric} label="" />
        </div>
        <TimeseriesChart data={timeseriesResult.data} metric={trendMetric} />
      </div>
    </div>
  )
}
