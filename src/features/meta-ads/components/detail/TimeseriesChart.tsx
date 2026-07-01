import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TimeseriesInsightRow } from '../../types/meta'
import { getMetricConfig } from '../../config/metrics'

interface TimeseriesChartProps {
  data: TimeseriesInsightRow[]
  metric: string
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

interface CustomTooltipPayload {
  name: string
  value: number
  payload: TimeseriesInsightRow
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: CustomTooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  const config = getMetricConfig(payload[0].name)
  let formatted = payload[0].value.toFixed(2)
  if (config?.format === 'currency') formatted = `$${payload[0].value.toFixed(2)}`
  else if (config?.format === 'percent') formatted = `${payload[0].value.toFixed(2)}%`
  else if (config?.format === 'compact') {
    const v = payload[0].value
    if (v >= 1000) formatted = `${(v / 1000).toFixed(1)}K`
    else formatted = v.toFixed(0)
  }
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      <div className="chart-tooltip-value">
        {config?.label ?? payload[0].name}: <strong>{formatted}</strong>
      </div>
    </div>
  )
}

export function TimeseriesChart({ data, metric, loading }: TimeseriesChartProps) {
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

  const chartData = data.map(row => ({
    date: formatXAxis(row.date_start),
    [metric]: extractMetricValue(row, metric),
  }))

  const config = getMetricConfig(metric)
  const color = 'var(--accent-blue)'

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
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false} tickLine={false} width={42}
            tickFormatter={v => {
              if (config?.format === 'currency') return `$${v}`
              if (config?.format === 'percent') return `${v}%`
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
              return v
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
