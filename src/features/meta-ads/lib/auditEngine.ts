import type { InsightRow } from '../types/meta'
import { extractRoas, extractCpl, getPrimaryResult } from '../types/meta'
import type { AuditRecommendation, AuditSeverity, HealthStatus, HealthSummary, Market } from '../types/audit'
import { AUDIT_THRESHOLDS as T, getMarketThresholds } from '../types/audit'

type EntityLevel = 'campaign' | 'adset' | 'ad'

function getName(row: InsightRow, level: EntityLevel): string {
  if (level === 'campaign') return row.campaign_name || 'Sin nombre'
  if (level === 'adset') return row.adset_name || 'Sin nombre'
  return row.ad_name || 'Sin nombre'
}

function getId(row: InsightRow, level: EntityLevel): string {
  if (level === 'campaign') return row.campaign_id || ''
  if (level === 'adset') return row.adset_id || ''
  return row.ad_id || ''
}

export function getRowHealth(row: InsightRow, market: Market = 'latam'): HealthStatus {
  const M = getMarketThresholds(market)
  const spend = parseFloat(row.spend) || 0
  const roas = extractRoas(row)
  const result = getPrimaryResult(row)
  const ctr = parseFloat(row.ctr) || 0
  const frequency = parseFloat(row.frequency) || 0

  if (roas > 0 && roas < T.ROAS_CRITICAL) return 'critical'
  if (spend > T.SPEND_NO_CONVERSION_CRITICAL && result.value === 0) return 'critical'
  if (frequency > M.FREQUENCY_CRITICAL) return 'critical'

  if (roas > 0 && roas < T.ROAS_WARNING) return 'warning'
  if (spend > T.SPEND_NO_CONVERSION_WARNING && result.value === 0) return 'warning'
  if (ctr > 0 && ctr < M.CTR_CRITICAL) return 'warning'
  if (frequency > M.FREQUENCY_WARNING) return 'warning'

  if (roas >= T.ROAS_EXCELLENT) return 'excellent'
  if (ctr >= T.CTR_EXCELLENT && roas >= T.ROAS_GOOD) return 'excellent'

  if (roas >= T.ROAS_GOOD) return 'good'
  if (ctr >= T.CTR_GOOD && result.value > 0) return 'good'

  return 'good'
}

export function getHealthSummary(rows: InsightRow[], market: Market = 'latam'): HealthSummary {
  const summary: HealthSummary = { excellent: 0, good: 0, warning: 0, critical: 0, total: rows.length }
  for (const row of rows) {
    const status = getRowHealth(row, market)
    summary[status]++
  }
  return summary
}

export function auditRows(rows: InsightRow[], level: EntityLevel, market: Market = 'latam'): AuditRecommendation[] {
  const recs: AuditRecommendation[] = []
  if (!rows.length) return recs

  const M = getMarketThresholds(market)
  const totalSpend = rows.reduce((sum, r) => sum + (parseFloat(r.spend) || 0), 0)

  for (const row of rows) {
    const name = getName(row, level)
    const spend = parseFloat(row.spend) || 0
    const result = getPrimaryResult(row)
    const ctr = parseFloat(row.ctr) || 0
    const cpc = parseFloat(row.cpc) || 0
    const cpm = parseFloat(row.cpm) || 0
    const cpl = extractCpl(row)
    const frequency = parseFloat(row.frequency) || 0
    const id = getId(row, level)

    if (result.value === 0 && spend > T.SPEND_NO_CONVERSION_WARNING) {
      const sev = spend > T.SPEND_NO_CONVERSION_CRITICAL ? 'critical' : 'warning'
      recs.push({
        id: `no-conv-${id}`, severity: sev,
        entityId: id, entityName: name, entityLevel: level,
        title: 'Gasto sin resultados',
        description: `$${spend.toFixed(0)} gastados sin ningún resultado (${result.label.toLowerCase()}) registrado.`,
        action: result.objective === 'messages'
          ? 'Revisa que el CTA apunte al canal de mensajes correcto y que la audiencia esté bien segmentada.'
          : result.objective === 'leads'
          ? 'Revisa el formulario de leads y la segmentación de audiencia.'
          : 'Verifica que el pixel esté disparando correctamente y revisa la página de destino.',
        metric: result.label, metricValue: 0,
      })
    }

    if (ctr > 0 && ctr < M.CTR_CRITICAL && spend > M.MIN_SPEND_FOR_DIAGNOSIS) {
      recs.push({
        id: `ctr-low-${id}`, severity: 'warning',
        entityId: id, entityName: name, entityLevel: level,
        title: 'CTR muy bajo',
        description: `CTR de ${ctr.toFixed(2)}%, por debajo del mínimo esperado (${M.CTR_CRITICAL}%).`,
        action: 'El copy o la creatividad no resuena con la audiencia. Prueba nuevas variantes de anuncio.',
        metric: 'CTR', metricValue: ctr,
      })
    }

    // Three levels: FREQUENCY_WATCH is an early warning ("vigilar"), not yet
    // a hard problem — kept as 'info' so it doesn't inflate the warning/
    // critical badge counts.
    if (frequency > M.FREQUENCY_WATCH) {
      const sev: AuditSeverity = frequency > M.FREQUENCY_CRITICAL ? 'critical' : frequency > M.FREQUENCY_WARNING ? 'warning' : 'info'
      recs.push({
        id: `freq-${id}`, severity: sev,
        entityId: id, entityName: name, entityLevel: level,
        title: sev === 'info' ? 'Frecuencia a vigilar' : 'Fatiga de audiencia',
        description: `Frecuencia de ${frequency.toFixed(1)}. Tu audiencia ve el anuncio demasiadas veces.`,
        action: 'Rota creativos, amplía la audiencia, o implementa exclusions de audiencia.',
        metric: 'Frecuencia', metricValue: frequency,
      })
    }

    if (cpc > M.CPC_WARNING && spend > 100) {
      const sev: AuditSeverity = cpc > M.CPC_CRITICAL ? 'critical' : 'warning'
      recs.push({
        id: `cpc-high-${id}`, severity: sev,
        entityId: id, entityName: name, entityLevel: level,
        title: 'CPC muy alto',
        description: `CPC de $${cpc.toFixed(2)}, por encima del umbral de ${sev === 'critical' ? 'crítico' : 'alerta'} para este mercado ($${(sev === 'critical' ? M.CPC_CRITICAL : M.CPC_WARNING).toFixed(2)}).`,
        action: 'Revisa la segmentación. Audiencias muy pequeñas o competidas elevan el CPC.',
        metric: 'CPC', metricValue: cpc,
      })
    }

    if (cpm > M.CPM_WARNING) {
      const sev: AuditSeverity = cpm > M.CPM_CRITICAL ? 'critical' : 'warning'
      recs.push({
        id: `cpm-high-${id}`, severity: sev,
        entityId: id, entityName: name, entityLevel: level,
        title: 'CPM elevado',
        description: `CPM de $${cpm.toFixed(0)}, por encima del umbral de ${sev === 'critical' ? 'crítico' : 'alerta'} para este mercado ($${(sev === 'critical' ? M.CPM_CRITICAL : M.CPM_WARNING).toFixed(0)}).`,
        action: 'Prueba audiencias más amplias o cambia el objetivo de campaña para reducir costos de delivery.',
        metric: 'CPM', metricValue: cpm,
      })
    }

    if (cpl != null && cpl > M.CPL_WARNING && spend > 100) {
      const sev: AuditSeverity = cpl > M.CPL_CRITICAL ? 'critical' : 'warning'
      recs.push({
        id: `cpl-high-${id}`, severity: sev,
        entityId: id, entityName: name, entityLevel: level,
        title: 'CPL elevado',
        description: `CPL de $${cpl.toFixed(2)}, por encima del umbral de ${sev === 'critical' ? 'crítico' : 'alerta'} para este mercado ($${(sev === 'critical' ? M.CPL_CRITICAL : M.CPL_WARNING).toFixed(2)}).`,
        action: 'Revisa segmentación, oferta y landing page. El costo por lead está por encima de lo sostenible.',
        metric: 'CPL', metricValue: cpl,
      })
    }

    if (spend > 0 && spend < M.MIN_SPEND_FOR_DIAGNOSIS) {
      recs.push({
        id: `low-spend-${id}`, severity: 'info',
        entityId: id, entityName: name, entityLevel: level,
        title: 'Gasto insuficiente para diagnóstico',
        description: `Solo $${spend.toFixed(2)} gastados — muy poco para evaluar el rendimiento de forma confiable.`,
        action: 'Esperá a que acumule más gasto antes de tomar decisiones sobre este elemento.',
        metric: 'Gasto', metricValue: spend,
      })
    }

    if (level === 'ad' && row.quality_ranking) {
      const qr = row.quality_ranking.toLowerCase()
      if (qr.includes('below')) {
        recs.push({
          id: `quality-${id}`, severity: 'warning',
          entityId: id, entityName: name, entityLevel: level,
          title: 'Calidad de anuncio baja',
          description: `Meta clasifica este anuncio con calidad "${row.quality_ranking.replace(/_/g, ' ')}".`,
          action: 'Meta penaliza tu delivery y aumenta costos. Mejora la relevancia del contenido para tu audiencia.',
          metric: 'Quality', metricValue: 0,
        })
      }
    }

    if (rows.length > 1 && totalSpend > 0 && spend / totalSpend > T.BUDGET_CONCENTRATION_WARNING) {
      const pct = (spend / totalSpend) * 100
      const sev = spend / totalSpend > T.BUDGET_CONCENTRATION_CRITICAL ? 'warning' : 'info'
      recs.push({
        id: `concentration-${id}`, severity: sev,
        entityId: id, entityName: name, entityLevel: level,
        title: 'Concentración de presupuesto',
        description: `Concentra el ${pct.toFixed(0)}% del gasto total de la cuenta.`,
        action: 'Diversifica el presupuesto entre más elementos para reducir riesgo y descubrir oportunidades.',
        metric: 'Gasto', metricValue: spend,
      })
    }
  }

  const severityOrder: Record<string, number> = { critical: 0, warning: 1, opportunity: 2, info: 3 }
  recs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return recs
}

export type SeverityRowCounts = Record<AuditSeverity, number>

// Counts distinct ROWS with at least one recommendation of each severity —
// not recommendation counts. A row with two 'critical' recs (e.g. low ROAS
// + high frequency) must only count once toward "críticos", otherwise the
// badge total overstates how many rows actually need attention. The four
// severities aren't mutually exclusive with each other (a row can be both
// critical and have an info-level note), so a row may be counted in more
// than one bucket — that's intentional.
export function countRowsBySeverity(recommendations: AuditRecommendation[]): SeverityRowCounts {
  const idsBySeverity: Record<AuditSeverity, Set<string>> = {
    critical: new Set(), warning: new Set(), opportunity: new Set(), info: new Set(),
  }
  for (const rec of recommendations) {
    idsBySeverity[rec.severity].add(rec.entityId)
  }
  return {
    critical: idsBySeverity.critical.size,
    warning: idsBySeverity.warning.size,
    opportunity: idsBySeverity.opportunity.size,
    info: idsBySeverity.info.size,
  }
}

// entityId set for one severity — used to filter the table down to just the
// rows carrying an alert of that level when a badge is clicked.
export function entityIdsWithSeverity(recommendations: AuditRecommendation[], severity: AuditSeverity): Set<string> {
  const ids = new Set<string>()
  for (const rec of recommendations) {
    if (rec.severity === severity) ids.add(rec.entityId)
  }
  return ids
}
