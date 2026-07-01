import { useSensitiveData } from '../../context/SensitiveDataContext'
import { formatNumber } from './SensitiveNumber'
import { Sparkline } from './Sparkline'

interface MetricCardProps {
  label: string
  value: number
  format?: 'currency' | 'number' | 'compact' | 'percent' | 'roas'
  currency?: string
  sensitive?: boolean
  previousValue?: number | null
  invertTrend?: boolean
  trendLabel?: string
  sparklineData?: number[]
}

function getValueColor(format: string, value: number): string | undefined {
  if (format === 'roas') {
    if (value >= 3) return 'var(--accent-green)'
    if (value > 0 && value < 1) return 'var(--accent-red)'
    if (value > 0) return 'var(--accent-yellow)'
  }
  if (format === 'percent') {
    if (value >= 2) return 'var(--accent-green)'
    if (value < 1 && value > 0) return 'var(--accent-red)'
  }
  return undefined
}

export function MetricCard({
  label, value, format = 'number', currency = 'MXN', sensitive = false,
  previousValue, invertTrend = false, trendLabel = 'vs anterior', sparklineData,
}: MetricCardProps) {
  const { isHidden } = useSensitiveData()
  const shouldBlur = sensitive && isHidden

  let formatted: string
  if (format === 'percent')    formatted = `${value.toFixed(2)}%`
  else if (format === 'roas')  formatted = `${value.toFixed(2)}x`
  else                         formatted = formatNumber(value, format, currency)

  const valueColor = getValueColor(format, value)

  let trendPercent: number | null = null
  let trendClass = 'neutral'
  if (previousValue != null && previousValue > 0) {
    trendPercent = ((value - previousValue) / previousValue) * 100
    const isImprovement = invertTrend ? trendPercent < 0 : trendPercent > 0
    trendClass = Math.abs(trendPercent) < 0.5 ? 'neutral' : isImprovement ? 'positive' : 'negative'
  }

  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <div>
          <div className="metric-card-label">{label}</div>
          <div
            className={`metric-card-value ${shouldBlur ? 'sensitive-hidden' : 'sensitive-visible'}`}
            style={valueColor ? { color: valueColor } : undefined}
          >
            {formatted}
          </div>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className={`metric-card-sparkline ${shouldBlur ? 'sensitive-hidden' : ''}`}>
            <Sparkline data={sparklineData} width={64} height={24} />
          </div>
        )}
      </div>
      {trendPercent != null && (
        <div className={`metric-card-trend ${trendClass}`}>
          <span>{trendPercent > 0 ? '↑' : trendPercent < 0 ? '↓' : '→'}</span>
          <span>{Math.abs(trendPercent).toFixed(1)}% {trendLabel}</span>
        </div>
      )}
    </div>
  )
}
