import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeseriesInsightRow } from '../../types/meta'
import { getMetricConfig, type MetricFormat } from '../../config/metrics'

interface TimeseriesChartProps {
  data: TimeseriesInsightRow[]
  metric: string
  compareMetric?: string
  // A second entity's timeseries, same metric(s), for entity-vs-entity comparison.
  compareEntityData?: TimeseriesInsightRow[]
  entityName?: string
  compareEntityName?: string
  loading?: boolean
}

function extractMetricValue(row: TimeseriesInsightRow, metric: string): number {
  if (metric === 'leads') {
    const action = row.actions?.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead')
    return action ? parseFloat(action.value) : 0
  }
  if (metric === 'cpl') {
    const action = row.cost_per_action_type?.find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead')
    return action ? parseFloat(action.value) : 0
  }
  const val = (row as Record<string, unknown>)[metric]
  if (typeof val === 'string') return parseFloat(val) || 0
  if (typeof val === 'number') return val
  return 0
}

function formatXAxis(dateStr: string) {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

// Terse formatting for axis ticks.
function formatTick(value: number, format?: MetricFormat): string {
  if (format === 'currency') return `$${value}`
  if (format === 'percent')  return `${value}%`
  if (format === 'roas')     return `${value}x`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return `${value}`
}

// Precise formatting for tooltip/legend values.
function formatValue(value: number, format?: MetricFormat): string {
  if (format === 'currency') return `$${value.toFixed(2)}`
  if (format === 'percent')  return `${value.toFixed(2)}%`
  if (format === 'roas')     return `${value.toFixed(2)}x`
  if (format === 'compact') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1000)      return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }
  return value.toFixed(2)
}

function buildDateMap(rows: TimeseriesInsightRow[]): Map<string, TimeseriesInsightRow> {
  const map = new Map<string, TimeseriesInsightRow>()
  for (const row of rows) map.set(row.date_start, row)
  return map
}

interface Series {
  key: string
  label: string
  format: MetricFormat
  color: string
  dashed: boolean
  yAxisId: 'left' | 'right'
}

interface TooltipPayloadEntry {
  dataKey: string
  name: string
  value: number
}

export function TimeseriesChart({
  data, metric, compareMetric, compareEntityData, entityName, compareEntityName, loading,
}: TimeseriesChartProps) {
  if (loading) {
    return <div className="chart-skeleton" />
  }

  if (!data.length) {
    return (
      <div className="chart-empty">
        <span>Sin datos para el período</span>
      </div>
    )
  }

  const config = getMetricConfig(metric)
  const compareConfig = compareMetric ? getMetricConfig(compareMetric) : null
  const comparingEntities = !!compareEntityData

  // Merge by date, not by array index — the two entities can have different
  // numbers of rows (e.g. one had no spend on a given day).
  const primaryMap = buildDateMap(data)
  const compareEntityMap = compareEntityData ? buildDateMap(compareEntityData) : null
  const allDates = Array.from(new Set([
    ...data.map(r => r.date_start),
    ...(compareEntityData?.map(r => r.date_start) ?? []),
  ])).sort()

  const chartData = allDates.map(dateStr => {
    const primaryRow = primaryMap.get(dateStr)
    const compareRow = compareEntityMap?.get(dateStr)
    const point: Record<string, unknown> = { date: formatXAxis(dateStr) }
    point.m1 = primaryRow ? extractMetricValue(primaryRow, metric) : undefined
    if (comparingEntities) point.m1b = compareRow ? extractMetricValue(compareRow, metric) : undefined
    if (compareConfig) point.m2 = primaryRow ? extractMetricValue(primaryRow, compareMetric!) : undefined
    if (compareConfig && comparingEntities) point.m2b = compareRow ? extractMetricValue(compareRow, compareMetric!) : undefined
    return point
  })

  const entityLabel = (base: string, isCompareEntity: boolean) =>
    comparingEntities ? `${base} (${isCompareEntity ? (compareEntityName ?? 'Comparación') : (entityName ?? 'Actual')})` : base

  const series: Series[] = [
    { key: 'm1', label: entityLabel(config.label, false), format: config.format, color: config.color, dashed: false, yAxisId: 'left' },
  ]
  if (comparingEntities) {
    series.push({ key: 'm1b', label: entityLabel(config.label, true), format: config.format, color: config.color, dashed: true, yAxisId: 'left' })
  }
  if (compareConfig) {
    series.push({ key: 'm2', label: entityLabel(compareConfig.label, false), format: compareConfig.format, color: compareConfig.color, dashed: false, yAxisId: 'right' })
    if (comparingEntities) {
      series.push({ key: 'm2b', label: entityLabel(compareConfig.label, true), format: compareConfig.format, color: compareConfig.color, dashed: true, yAxisId: 'right' })
    }
  }
  const formatByKey: Record<string, MetricFormat> = {}
  series.forEach(s => { formatByKey[s.key] = s.format })
  const showLegend = series.length > 1

  function renderTooltip(props: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
    const { active, payload, label } = props
    if (!active || !payload?.length) return null
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-date">{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} className="chart-tooltip-value">
            {p.name}: <strong>{formatValue(p.value, formatByKey[p.dataKey])}</strong>
          </div>
        ))}
      </div>
    )
  }

  // Recharts can keep a stale internal layout when Line/YAxis children are
  // added or removed dynamically (e.g. turning a metric/entity comparison on
  // or off) instead of the data within an existing series changing. Keying
  // the chart by the active series set forces a clean remount instead of a
  // reconciliation that can silently drop the new series.
  const chartKey = series.map(s => s.key).join('-')

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart key={chartKey} data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"   stopColor={config.color} stopOpacity={0.25} />
              <stop offset="95%"  stopColor={config.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false} tickLine={false} interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false} tickLine={false} width={42}
            tickFormatter={(v) => formatTick(v, config.format)}
          />
          {compareConfig && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={false} tickLine={false} width={42}
              tickFormatter={(v) => formatTick(v, compareConfig.format)}
            />
          )}
          <Tooltip content={renderTooltip} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="m1"
            name={series[0].label}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            dot={false}
            activeDot={{ r: 4, fill: config.color }}
          />
          {series.filter(s => s.key !== 'm1').map(s => (
            <Line
              key={s.key}
              yAxisId={s.yAxisId}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              dot={false}
              activeDot={{ r: 4, fill: s.color }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
