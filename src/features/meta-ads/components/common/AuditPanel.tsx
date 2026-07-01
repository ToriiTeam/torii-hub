import { useState } from 'react'
import type { AuditRecommendation } from '../../types/audit'
import { useSensitiveData } from '../../context/SensitiveDataContext'

interface AuditPanelProps {
  recommendations: AuditRecommendation[]
  onSelect?: (rec: AuditRecommendation) => void
}

const SEVERITY_CONFIG = {
  critical: { icon: '🔴', label: 'CRÍTICO', className: 'audit-critical' },
  warning: { icon: '⚠️', label: 'ALERTA', className: 'audit-warning' },
  opportunity: { icon: '🟢', label: 'OPORTUNIDAD', className: 'audit-opportunity' },
  info: { icon: 'ℹ️', label: 'INFO', className: 'audit-info' },
}

export function AuditPanel({ recommendations, onSelect }: AuditPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { isHidden } = useSensitiveData()
  const blurClass = isHidden ? 'sensitive-hidden' : 'sensitive-visible'

  if (recommendations.length === 0) {
    return (
      <div className="audit-panel">
        <button className="audit-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="audit-panel-title">
            <span className="audit-panel-icon">🧠</span>
            <span>Auditor</span>
            <span className="audit-panel-badge audit-panel-badge-ok">Todo en orden ✓</span>
          </div>
        </button>
      </div>
    )
  }

  const criticalCount = recommendations.filter(r => r.severity === 'critical').length
  const warningCount  = recommendations.filter(r => r.severity === 'warning').length
  const oppCount      = recommendations.filter(r => r.severity === 'opportunity').length

  return (
    <div className={`audit-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button className="audit-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="audit-panel-title">
          <span className="audit-panel-icon">🧠</span>
          <span>Auditor</span>
          {criticalCount > 0 && (
            <span className="audit-panel-badge audit-panel-badge-critical">{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</span>
          )}
          {warningCount > 0 && (
            <span className="audit-panel-badge audit-panel-badge-warning">{warningCount} alerta{warningCount > 1 ? 's' : ''}</span>
          )}
          {oppCount > 0 && (
            <span className="audit-panel-badge audit-panel-badge-opportunity">{oppCount} oportunidad{oppCount > 1 ? 'es' : ''}</span>
          )}
        </div>
        <svg className={`audit-panel-chevron ${isExpanded ? 'rotated' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="audit-panel-body">
          {recommendations.map((rec) => {
            const config = SEVERITY_CONFIG[rec.severity]
            return (
              <div
                key={rec.id}
                className={`audit-card ${config.className}${onSelect ? ' audit-card-clickable' : ''}`}
                onClick={onSelect ? () => onSelect(rec) : undefined}
                style={onSelect ? { cursor: 'pointer' } : undefined}
              >
                <div className="audit-card-header">
                  <span className="audit-card-severity">
                    <span className="audit-card-severity-icon">{config.icon}</span>
                    {config.label}
                  </span>
                  <span className={`audit-card-entity ${blurClass}`}>{rec.entityName}</span>
                </div>
                <div className="audit-card-title">{rec.title}</div>
                <div className={`audit-card-description ${blurClass}`}>{rec.description}</div>
                <div className="audit-card-action">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                  {rec.action}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
