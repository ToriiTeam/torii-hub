import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '../ui/sheet'
import { useSelection } from '../../context/SelectionContext'
import { useAccount } from '../../context/AccountContext'
import { useDateRange } from '../../context/DateRangeContext'
import { useTimeseries } from '../../hooks/useTimeseries'
import { useMetaApi } from '../../hooks/useMetaApi'
import { getMetricConfig, METRIC_OPTIONS } from '../../config/metrics'
import { auditSingleEntity } from '../../lib/auditEngine'
import { useSensitiveData } from '../../context/SensitiveDataContext'
import type { InsightRow, TabLevel } from '../../types/meta'
import { SummaryKPIs } from './SummaryKPIs'
import { TimeseriesChart } from './TimeseriesChart'
import { MetricSelector, NONE_METRIC } from './MetricSelector'
import { EntitySelector, NONE_ENTITY, type EntityOption } from './EntitySelector'
import { AuditPanel } from '../common/AuditPanel'
import { StatusBadge } from '../common/StatusBadge'

const ENDPOINT_SEGMENT: Record<TabLevel, string> = {
  campaign: 'campaigns',
  adset: 'adsets',
  ad: 'ads',
}

function idOf(row: InsightRow, level: TabLevel): string {
  return (level === 'campaign' ? row.campaign_id : level === 'adset' ? row.adset_id : row.ad_id) ?? ''
}

function nameOf(row: InsightRow, level: TabLevel): string {
  return (level === 'campaign' ? row.campaign_name : level === 'adset' ? row.adset_name : row.ad_name) ?? ''
}

interface DetailPanelBodyProps {
  row: InsightRow
  level: TabLevel
  accountId: string | null
}

// Split out from DetailPanel and mounted with key={entityType:entityId} by
// the parent below. All of this component's local state (selected metric,
// comparison metric, comparison entity) is specific to one entity — keying
// on the entity resets that state for free on every new selection, instead
// of needing a useEffect to manually reset stale comparison state whenever
// the user opens a different row.
function DetailPanelBody({ row, level, accountId }: DetailPanelBodyProps) {
  const { buildParams } = useDateRange()
  const { market } = useAccount()
  const [metric, setMetric] = useState('spend')
  const [compareMetric, setCompareMetric] = useState(NONE_METRIC)
  const [compareEntityId, setCompareEntityId] = useState(NONE_ENTITY)

  const entityId = idOf(row, level)
  const entityName = nameOf(row, level) || 'Entidad'

  const timeseriesResult = useTimeseries(accountId, level, entityId)

  // Sibling entities (other campaigns/adsets/ads in the same account/period)
  // to populate the "Comparar con entidad" dropdown.
  const siblingEndpoint = accountId
    ? `/accounts/${accountId}/${ENDPOINT_SEGMENT[level]}?${buildParams()}`
    : ''
  const { data: siblingRows } = useMetaApi<InsightRow[]>(siblingEndpoint, !!accountId)

  const entityOptions: EntityOption[] = (siblingRows ?? [])
    .filter((r) => idOf(r, level) !== entityId)
    .map((r) => ({ id: idOf(r, level), name: nameOf(r, level) }))

  const comparingEntity = compareEntityId !== NONE_ENTITY
  const compareTimeseriesResult = useTimeseries(
    accountId,
    level,
    comparingEntity ? compareEntityId : null,
  )
  const compareEntityName = entityOptions.find((o) => o.id === compareEntityId)?.name

  // The trend chart only ever shows 2 series: the primary metric, plus
  // either a second metric OR a second entity — never both at once.
  // Turning one comparison on switches the other off.
  const handleCompareMetricChange = (value: string) => {
    setCompareMetric(value)
    if (value !== NONE_METRIC) setCompareEntityId(NONE_ENTITY)
  }
  const handleCompareEntityChange = (value: string) => {
    setCompareEntityId(value)
    if (value !== NONE_ENTITY) setCompareMetric(NONE_METRIC)
  }

  const recommendations = auditSingleEntity(row, level, market)
  const metricConfig = getMetricConfig(metric)

  return (
    <>
      <section className="detail-section">
        <h3 className="detail-section-title">KPIs del período</h3>
        <SummaryKPIs row={row} />
      </section>

      <section className="detail-section">
        <div className="detail-section-header">
          <h3 className="detail-section-title">Tendencia</h3>
          <div className="detail-section-selectors">
            <MetricSelector value={metric} onChange={setMetric} label="" />
            <MetricSelector
              value={compareMetric}
              onChange={handleCompareMetricChange}
              label="Comparar métrica"
              includeNone
              options={compareEntityId !== NONE_ENTITY ? METRIC_OPTIONS : METRIC_OPTIONS.filter((m) => m.key !== metric)}
            />
            <EntitySelector
              value={compareEntityId}
              onChange={handleCompareEntityChange}
              label="Comparar entidad"
              options={entityOptions}
            />
          </div>
        </div>
        <div className="detail-metric-label">{metricConfig?.label ?? metric}</div>
        <TimeseriesChart
          data={timeseriesResult.data ?? []}
          metric={metric}
          compareMetric={compareMetric === NONE_METRIC ? undefined : compareMetric}
          compareEntityData={comparingEntity ? (compareTimeseriesResult.data ?? []) : undefined}
          entityName={entityName}
          compareEntityName={compareEntityName}
          loading={timeseriesResult.loading || (comparingEntity && compareTimeseriesResult.loading)}
        />
      </section>

      {recommendations.length > 0 && (
        <section className="detail-section">
          <AuditPanel recommendations={recommendations} />
        </section>
      )}
    </>
  )
}

export function DetailPanel() {
  const { selectedRow, selectedLevel, clearSelection } = useSelection()
  const { selectedAccount } = useAccount()
  const { isHidden } = useSensitiveData()

  const entityType = selectedLevel ?? 'campaign'
  const isOpen = !!selectedRow
  const entityName = selectedRow ? (nameOf(selectedRow, entityType) || 'Entidad') : ''
  const entityId = selectedRow ? idOf(selectedRow, entityType) : null

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
          {selectedRow && (
            <DetailPanelBody
              key={`${entityType}:${entityId}`}
              row={selectedRow}
              level={entityType}
              accountId={selectedAccount?.account_id ?? null}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
