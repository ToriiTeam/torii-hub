interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showDot?: boolean
}

export function Sparkline({ data, width = 60, height = 20, color = 'var(--accent-blue)', showDot = true }: SparklineProps) {
  if (!data.length || data.every(d => d === 0)) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const first = data[0]
  const last  = data[data.length - 1]
  const trendColor = last > first ? 'var(--accent-green)' : last < first ? 'var(--accent-red)' : color
  const lastPoint = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline" style={{ display: 'block', flexShrink: 0 }}>
      <path d={pathD} fill="none" stroke={trendColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      {showDot && lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2} fill={trendColor} stroke="var(--bg-secondary)" strokeWidth={1} />
      )}
    </svg>
  )
}
