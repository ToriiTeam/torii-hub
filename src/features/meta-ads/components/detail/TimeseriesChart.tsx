import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

// Fixed colors for the compared entity's lines, distinct from whatever the
// metric's own accent color is (m1/m2 reuse metrics.ts's per-metric color).
const COMPARE_ENTITY_COLOR_LEFT = '#a78bfa'
const COMPARE_ENTITY_COLOR_RIGHT = '#f0abfc'

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

  // Entity-vs-entity comparison aligns by position (Día 1, Día 2, ...)
  // instead of calendar date — two entities can have run in non-overlapping
  // windows and would otherwise never share an x-axis point. Without an
  // entity comparison, the trend chart keeps its original date-based axis.
  const chartData = comparingEntities
    ? Array.from({ length: Math.max(data.length, compareEntityData!.length) }, (_, i) => ({
        day: `Día ${i + 1}`,
        m1: extractMetricValue(data[i], metric),
        m1b: extractMetricValue(compareEntityData![i], metric),
        ...(compareConfig ? {
          m2:  extractMetricValue(data[i], compareMetric!),
          m2b: extractMetricValue(compareEntityData![i], compareMetric!),
        } : {}),
      }))
    : data.map(row => ({
        day: formatXAxis(row.date_start),
        m1: extractMetricValue(row, metric),
        ...(compareConfig ? { m2: extractMetricValue(row, compareMetric!) } : {}),
      }))

  const entityLabel = (base: string, isCompareEntity: boolean) =>
    comparingEntities ? `${base} (${isCompareEntity ? (compareEntityName ?? 'Comparación') : (entityName ?? 'Actual')})` : base

  const m1Label  = entityLabel(config.label, false)
  const m1bLabel = entityLabel(config.label, true)
  const m2Label  = compareConfig ? entityLabel(compareConfig.label, false) : ''
  const m2bLabel = compareConfig ? entityLabel(compareConfig.label, true)  : ''

  const formatByKey: Record<string, MetricFormat> = { m1: config.format }
  if (comparingEntities) formatByKey.m1b = config.format
  if (compareConfig) {
    formatByKey.m2 = compareConfig.format
    if (comparingEntities) formatByKey.m2b = compareConfig.format
  }

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

  const showLegend = comparingEntities || !!compareConfig

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
            name={m1Label}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4, fill: config.color }}
          />
          {comparingEntities && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="m1b"
              name={m1bLabel}
              stroke={COMPARE_ENTITY_COLOR_LEFT}
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: COMPARE_ENTITY_COLOR_LEFT }}
            />
          )}
          {compareConfig && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="m2"
              name={m2Label}
              stroke={compareConfig.color}
              strokeWidth={2}
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: compareConfig.color }}
            />
          )}
          {compareConfig && comparingEntities && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="m2b"
              name={m2bLabel}
              stroke={COMPARE_ENTITY_COLOR_RIGHT}
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: COMPARE_ENTITY_COLOR_RIGHT }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
