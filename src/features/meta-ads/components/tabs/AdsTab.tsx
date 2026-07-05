import { useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import { useDateRange } from '../../context/DateRangeContext'
import { useSelection } from '../../context/SelectionContext'
import { useMetaApi } from '../../hooks/useMetaApi'
import { auditRows, entityIdsWithSeverity, getHealthSummary } from '../../lib/auditEngine'
import type { AuditSeverity } from '../../types/audit'
import type { InsightRow } from '../../types/meta'
import { extractLeads, extractCpl } from '../../types/meta'
import { DataTable } from '../common/DataTable'
import type { Column, FilterConfig } from '../common/DataTable'
import { SkeletonTable } from '../common/SkeletonLoader'
import { StatusBadge } from '../common/StatusBadge'
import { AuditSeverityBar } from '../common/AuditSeverityBar'
import { HealthBanner } from '../common/HealthBanner'
import { SensitiveNumber } from '../common/SensitiveNumber'
import { SensitiveText } from '../common/SensitiveText'

type AdRow = InsightRow & {
  ad_id: string
  ad_name: string
  adset_name: string
  campaign_name: string
  status: string
  effective_status: string
  quality_ranking?: string
  engagement_rate_ranking?: string
  conversion_rate_ranking?: string
}

function QualityBadge({ value }: { value?: string }) {
  if (!value) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>
  const colorMap: Record<string, string> = {
    ABOVE_AVERAGE: 'var(--accent-green)',
    AVERAGE: 'var(--accent-yellow)',
    BELOW_AVERAGE_10: 'var(--accent-red)',
    BELOW_AVERAGE_20: 'var(--accent-red)',
    BELOW_AVERAGE_35: 'var(--accent-red)',
  }
  const labelMap: Record<string, string> = {
    ABOVE_AVERAGE: 'Superior',
    AVERAGE: 'Promedio',
    BELOW_AVERAGE_10: 'Bajo 10%',
    BELOW_AVERAGE_20: 'Bajo 20%',
    BELOW_AVERAGE_35: 'Bajo 35%',
  }
  return (
    <span style={{ color: colorMap[value] ?? 'var(--text-secondary)', fontSize: 11 }}>
      {labelMap[value] ?? value}
    </span>
  )
}

const columns: Column<AdRow>[] = [
  {
    key: 'ad_name', label: 'Anuncio', priority: 'high',
    render: (r) => (
      <div>
        <SensitiveText>{r.ad_name}</SensitiveText>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          <SensitiveText>{r.adset_name}</SensitiveText>
        </div>
      </div>
    ),
    sortValue: (r) => r.ad_name,
  },
  {
    key: 'effective_status', label: 'Estado',
    render: (r) => <StatusBadge status={r.effective_status || r.status || ''} />,
    sortValue: (r) => r.effective_status || '',
  },
  {
    key: 'spend', label: 'Gasto',
    render: (r) => <SensitiveNumber value={parseFloat(r.spend || '0')} format="currency" />,
    sortValue: (r) => parseFloat(r.spend || '0'),
  },
  {
    key: 'ctr', label: 'CTR',
    render: (r) => `${parseFloat(r.ctr || '0').toFixed(2)}%`,
    sortValue: (r) => parseFloat(r.ctr || '0'),
  },
  {
    key: 'leads', label: 'Leads',
    render: (r) => extractLeads(r).toString(),
    sortValue: (r) => extractLeads(r),
  },
  {
    key: 'cpl', label: 'CPL',
    render: (r) => {
      const cpl = extractCpl(r)
      return cpl != null ? <SensitiveNumber value={cpl} format="currency" /> : '—'
    },
    sortValue: (r) => extractCpl(r) ?? 999999,
  },
  {
    key: 'quality_ranking', label: 'Calidad', priority: 'low',
    render: (r) => <QualityBadge value={r.quality_ranking} />,
    sortValue: (r) => r.quality_ranking ?? '',
  },
  {
    key: 'engagement_rate_ranking', label: 'Engagement', priority: 'low',
    render: (r) => <QualityBadge value={r.engagement_rate_ranking} />,
    sortValue: (r) => r.engagement_rate_ranking ?? '',
  },
  {
    key: 'conversion_rate_ranking', label: 'Conversión', priority: 'low',
    render: (r) => <QualityBadge value={r.conversion_rate_ranking} />,
    sortValue: (r) => r.conversion_rate_ranking ?? '',
  },
]

const filters: FilterConfig<AdRow>[] = [
  {
    key: 'campaign',
    label: 'Campaña',
    getOptions: (data) => Array.from(new Set(data.map(r => r.campaign_name).filter(Boolean))),
    matches: (row, val) => row.campaign_name === val,
  },
  {
    key: 'adset',
    label: 'Conjunto',
    getOptions: (data) => Array.from(new Set(data.map(r => r.adset_name).filter(Boolean))),
    matches: (row, val) => row.adset_name === val,
  },
]

export function AdsTab() {
  const { selectedAccount, market } = useAccount()
  const { buildParams } = useDateRange()
  const { setSelectedRow } = useSelection()
  const [activeSeverity, setActiveSeverity] = useState<AuditSeverity | null>(null)

  const params = buildParams()
  const endpoint = selectedAccount
    ? `/accounts/${selectedAccount.account_id}/ads?${params}`
    : ''

  const { data, loading } = useMetaApi<AdRow[]>(endpoint, !!selectedAccount)

  if (!selectedAccount) return <div className="tab-empty">Seleccioná una cuenta.</div>
  if (loading) return <SkeletonTable />

  const rows: AdRow[] = data ?? []
  const recommendations = auditRows(rows, 'ad', market)
  const healthSummary = getHealthSummary(rows, market)

  const activeSeverityIds = activeSeverity ? entityIdsWithSeverity(recommendations, activeSeverity) : null
  const visibleRows = activeSeverityIds ? rows.filter(r => activeSeverityIds.has(r.ad_id)) : rows

  return (
    <div className="tab-content">
      <HealthBanner summary={healthSummary} />
      <AuditSeverityBar
        recommendations={recommendations}
        activeSeverity={activeSeverity}
        onToggle={(severity) => setActiveSeverity(prev => (prev === severity ? null : severity))}
      />
      <DataTable
        columns={columns}
        data={visibleRows}
        filters={filters}
        searchPlaceholder="Buscar anuncio..."
        searchField={(r) => r.ad_name}
        onRowClick={(row) => setSelectedRow(row, 'ad')}
      />
    </div>
  )
}
