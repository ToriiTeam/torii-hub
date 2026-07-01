import type { HealthSummary } from '../../types/audit'

interface HealthBannerProps {
  summary: HealthSummary
}

export function HealthBanner({ summary }: HealthBannerProps) {
  const { excellent, good, warning, critical, total } = summary
  if (total === 0) return null

  const segments = [
    { count: excellent, label: 'Excelente', color: 'var(--accent-green)', icon: '✓' },
    { count: good,      label: 'Bueno',     color: 'var(--accent-blue)',  icon: '●' },
    { count: warning,   label: 'Atención',  color: 'var(--accent-yellow)', icon: '⚠' },
    { count: critical,  label: 'Crítico',   color: 'var(--accent-red)',   icon: '✕' },
  ].filter(s => s.count > 0)

  return (
    <div className="health-banner">
      <div className="health-banner-bar">
        {segments.map((seg) => (
          <div key={seg.label} className="health-banner-segment" style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }} />
        ))}
      </div>
      <div className="health-banner-labels">
        {segments.map((seg) => (
          <div key={seg.label} className="health-banner-label" style={{ color: seg.color }}>
            <span className="health-banner-icon">{seg.icon}</span>
            <span className="health-banner-count">{seg.count}</span>
            <span className="health-banner-text">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
