import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeseriesInsightRow } from '../../types/meta'
import { getMetricConfig, type MetricFormat } from '../../config/metrics'

interface TimeseriesChartProps {
  data: TimeseriesInsightRow[]
  metric: string
  // Mutually exclusive with compareEntityData — the caller only ever sets
  // one of the two, so the chart never has to show more than 2 series.
  compareMetric?: string
  compareEntityData?: TimeseriesInsightRow[]
  entityName?: string
  compareEntityName?: string
  loading?: boolean
}

function extractMetricValue(row: TimeseriesInsightRow | undefined, metric: string): number | undefined {
  if (!row) return undefined
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

// Fixed color for the compared entity's line when comparing the same metric
// across two entities — m1 and m1b would otherwise share metrics.ts's color
// for that metric.
const COMPARE_ENTITY_COLOR = '#a78bfa'

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
  const comparingMetric = !!compareMetric
  const comparingEntities = !!compareEntityData
  const compareConfig = comparingMetric ? getMetricConfig(compareMetric!) : null

  // Entity-vs-entity comparison aligns by position (Día 1, Día 2, ...)
  // instead of calendar date — two entities can have run in non-overlapping
  // windows and would otherwise never share an x-axis point. Metric-vs-metric
  // comparison (same entity) keeps the original date-based axis.
  const chartData = comparingEntities
    ? Array.from({ length: Math.max(data.length, compareEntityData!.length) }, (_, i) => ({
        day: `Día ${i + 1}`,
        m1:  extractMetricValue(data[i], metric),
        m1b: extractMetricValue(compareEntityData![i], metric),
      }))
    : data.map(row => ({
        day: formatXAxis(row.date_start),
        m1: extractMetricValue(row, metric),
        ...(comparingMetric ? { m1b: extractMetricValue(row, compareMetric!) } : {}),
      }))

  const m1Label = comparingEntities ? `${config.label} (${entityName ?? 'Actual'})` : config.label
  const m1bLabel = comparingEntities
    ? `${config.label} (${compareEntityName ?? 'Comparación'})`
    : compareConfig?.label ?? ''
  const m1bColor = comparingEntities ? COMPARE_ENTITY_COLOR : (compareConfig?.color ?? COMPARE_ENTITY_COLOR)
  const m1bFormat = comparingEntities ? config.format : compareConfig?.format

  const showSecondSeries = comparingMetric || comparingEntities
  const showLegend = showSecondSeries

  const formatByKey: Record<string, MetricFormat> = { m1: config.format }
  if (showSecondSeries) formatByKey.m1b = m1bFormat ?? config.format

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

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"   stopColor={config.color} stopOpacity={0.25} />
              <stop offset="95%"  stopColor={config.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false} tickLine={false} interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false} tickLine={false} width={42}
            tickFormatter={(v) => formatTick(v, config.format)}
          />
          <Tooltip content={renderTooltip} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="m1"
            name={m1Label}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4, fill: config.color }}
          />
          {showSecondSeries && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="m1b"
              name={m1bLabel}
              stroke={m1bColor}
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: m1bColor }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
