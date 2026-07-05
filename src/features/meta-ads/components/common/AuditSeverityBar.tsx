import type { AuditRecommendation, AuditSeverity } from '../../types/audit'
import { countRowsBySeverity } from '../../lib/auditEngine'

interface AuditSeverityBarProps {
  recommendations: AuditRecommendation[]
  activeSeverity: AuditSeverity | null
  onToggle: (severity: AuditSeverity) => void
}

const BADGES: { severity: AuditSeverity; label: (n: number) => string; className: string }[] = [
  { severity: 'critical', label: n => `${n} crítico${n === 1 ? '' : 's'}`, className: 'severity-badge-critical' },
  { severity: 'warning', label: n => `${n} alerta${n === 1 ? '' : 's'}`, className: 'severity-badge-warning' },
  { severity: 'opportunity', label: n => `${n} oportunidad${n === 1 ? '' : 'es'}`, className: 'severity-badge-opportunity' },
  { severity: 'info', label: n => `${n} info`, className: 'severity-badge-info' },
]

// Thin, always-visible replacement for the collapsible AuditPanel list on
// the Campañas/Conjuntos/Anuncios tabs: just clickable counts, no expanded
// card list. Clicking a badge filters the table to rows carrying at least
// one alert of that severity; clicking the active badge again clears it —
// the toggle logic lives in the parent tab (it owns the table's row filter).
export function AuditSeverityBar({ recommendations, activeSeverity, onToggle }: AuditSeverityBarProps) {
  const counts = countRowsBySeverity(recommendations)
  const visible = BADGES.filter(b => counts[b.severity] > 0)
  if (visible.length === 0) return null

  return (
    <div className="audit-severity-bar">
      {visible.map(b => (
        <button
          key={b.severity}
          type="button"
          className={`severity-badge ${b.className}${activeSeverity === b.severity ? ' active' : ''}`}
          onClick={() => onToggle(b.severity)}
        >
          {b.label(counts[b.severity])}
        </button>
      ))}
    </div>
  )
}
