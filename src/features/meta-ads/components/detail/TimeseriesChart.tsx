import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeseriesInsightRow } from '../../types/meta'
import { getMetricConfig, type MetricFormat } from '../../config/metrics'

interface TimeseriesChartProps {
  data: TimeseriesInsightRow[]
  metric: string
  compareMetric?: string
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

interface CustomTooltipPayload {
  dataKey: string
  value: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: CustomTooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      {payload.map((p) => {
        const config = getMetricConfig(p.dataKey)
        return (
          <div key={p.dataKey} className="chart-tooltip-value">
            {config?.label ?? p.dataKey}: <strong>{formatValue(p.value, config?.format)}</strong>
          </div>
        )
      })}
    </div>
  )
}

export function TimeseriesChart({ data, metric, compareMetric, loading }: TimeseriesChartProps) {
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

  const chartData = data.map(row => {
    const point: Record<string, unknown> = {
      date: formatXAxis(row.date_start),
      [metric]: extractMetricValue(row, metric),
    }
    if (compareMetric) point[compareMetric] = extractMetricValue(row, compareMetric)
    return point
  })

  const config = getMetricConfig(metric)
  const color = config.color
  const compareConfig = compareMetric ? getMetricConfig(compareMetric) : null
  const compareColor = compareConfig?.color ?? 'var(--accent-purple)'

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"   stopColor={color} stopOpacity={0.25} />
              <stop offset="95%"  stopColor={color} stopOpacity={0.02} />
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
          {compareMetric && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              axisLine={false} tickLine={false} width={42}
              tickFormatter={(v) => formatTick(v, compareConfig?.format)}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {compareMetric && (
            <Legend
              formatter={(value) => getMetricConfig(value as string)?.label ?? value}
              wrapperStyle={{ fontSize: 11 }}
            />
          )}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey={metric}
            name={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
          {compareMetric && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={compareMetric}
              name={compareMetric}
              stroke={compareColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: compareColor }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
