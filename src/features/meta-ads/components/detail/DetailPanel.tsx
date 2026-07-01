import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '../ui/sheet'
import { useSelection } from '../../context/SelectionContext'
import { useAccount } from '../../context/AccountContext'
import { useTimeseries } from '../../hooks/useTimeseries'
import { getMetricConfig, METRIC_OPTIONS } from '../../config/metrics'
import { auditSingleEntity } from '../../lib/auditEngine'
import { useSensitiveData } from '../../context/SensitiveDataContext'
import type { InsightRow } from '../../types/meta'
import { SummaryKPIs } from './SummaryKPIs'
import { TimeseriesChart } from './TimeseriesChart'
import { MetricSelector, NONE_METRIC } from './MetricSelector'
import { AuditPanel } from '../common/AuditPanel'
import { StatusBadge } from '../common/StatusBadge'

export function DetailPanel() {
  const { selectedRow, selectedLevel, clearSelection } = useSelection()
  const { selectedAccount } = useAccount()
  const { isHidden } = useSensitiveData()
  const [metric, setMetric] = useState('spend')
  const [compareMetric, setCompareMetric] = useState(NONE_METRIC)

  // The metric being compared can't also be the primary metric — if the user
  // switches the primary selector to whatever was selected for comparison,
  // drop the now-invalid comparison instead of leaving a stale value that no
  // longer appears in its (filtered) option list.
  useEffect(() => {
    if (compareMetric === metric) setCompareMetric(NONE_METRIC)
  }, [metric, compareMetric])

  const entityType = selectedLevel ?? 'campaign'

  const entityId = selectedRow
    ? (entityType === 'campaign' ? (selectedRow as InsightRow & { campaign_id?: string }).campaign_id
      : entityType === 'adset' ? (selectedRow as InsightRow & { adset_id?: string }).adset_id
      : (selectedRow as InsightRow & { ad_id?: string }).ad_id)
    : null

  const timeseriesResult = useTimeseries(
    selectedAccount?.account_id ?? null,
    entityType,
    entityId ?? null,
  )

  const isOpen = !!selectedRow
  const entityName = selectedRow
    ? (entityType === 'campaign' ? (selectedRow as InsightRow & { campaign_name?: string }).campaign_name
      : entityType === 'adset' ? (selectedRow as InsightRow & { adset_name?: string }).adset_name
      : (selectedRow as InsightRow & { ad_name?: string }).ad_name) ?? 'Entidad'
    : ''

  const recommendations = selectedRow ? auditSingleEntity(selectedRow, entityType) : []
  const metricConfig = getMetricConfig(metric)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) clearSelection() }}>
      <SheetContent side="right" className="detail-sheet" aria-describedby={undefined}>
        <SheetHeader className="detail-sheet-header">
          <div className="detail-sheet-title-row">
            <SheetTitle className={`detail-sheet-title ${isHidden ? 'sensitive-hidden' : ''}`}>
              {entityName}
            </SheetTitle>
            <SheetClose className="detail-sheet-close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </SheetClose>
          </div>
          <div className="detail-sheet-meta">
            <span className="detail-sheet-level">{selectedLevel}</span>
            {selectedRow && (selectedRow as InsightRow & { effective_status?: string }).effective_status && (
              <StatusBadge status={(selectedRow as InsightRow & { effective_status?: string }).effective_status!} />
            )}
          </div>
        </SheetHeader>

        <div className="detail-sheet-body">
          <section className="detail-section">
            <h3 className="detail-section-title">KPIs del período</h3>
            <SummaryKPIs row={selectedRow} />
          </section>

          <section className="detail-section">
            <div className="detail-section-header">
              <h3 className="detail-section-title">Tendencia</h3>
              <div className="detail-section-selectors">
                <MetricSelector value={metric} onChange={setMetric} label="" />
                <MetricSelector
                  value={compareMetric}
                  onChange={setCompareMetric}
                  label="Comparar con"
                  includeNone
                  options={METRIC_OPTIONS.filter((m) => m.key !== metric)}
                />
              </div>
            </div>
            <div className="detail-metric-label">{metricConfig?.label ?? metric}</div>
            <TimeseriesChart
              data={timeseriesResult.data ?? []}
              metric={metric}
              compareMetric={compareMetric === NONE_METRIC ? undefined : compareMetric}
              loading={timeseriesResult.loading}
            />
          </section>

          {recommendations.length > 0 && (
            <section className="detail-section">
              <AuditPanel recommendations={recommendations} />
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
