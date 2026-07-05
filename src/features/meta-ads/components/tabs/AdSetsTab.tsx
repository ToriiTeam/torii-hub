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

type AdSetRow = InsightRow & {
  adset_id: string
  adset_name: string
  campaign_name: string
  status: string
  effective_status: string
}

const columns: Column<AdSetRow>[] = [
  {
    key: 'adset_name', label: 'Conjunto de anuncios', priority: 'high',
    render: (r) => (
      <div>
        <SensitiveText>{r.adset_name}</SensitiveText>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          <SensitiveText>{r.campaign_name}</SensitiveText>
        </div>
      </div>
    ),
    sortValue: (r) => r.adset_name,
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
    key: 'impressions', label: 'Impresiones', priority: 'low',
    render: (r) => <SensitiveNumber value={parseInt(r.impressions || '0', 10)} format="compact" />,
    sortValue: (r) => parseInt(r.impressions || '0', 10),
  },
  {
    key: 'clicks', label: 'Clics', priority: 'low',
    render: (r) => parseInt(r.clicks || '0', 10).toLocaleString('es-MX'),
    sortValue: (r) => parseInt(r.clicks || '0', 10),
  },
  {
    key: 'ctr', label: 'CTR',
    render: (r) => `${parseFloat(r.ctr || '0').toFixed(2)}%`,
    sortValue: (r) => parseFloat(r.ctr || '0'),
  },
  {
    key: 'cpm', label: 'CPM', priority: 'low',
    render: (r) => <SensitiveNumber value={parseFloat(r.cpm || '0')} format="currency" />,
    sortValue: (r) => parseFloat(r.cpm || '0'),
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
]

const filters: FilterConfig<AdSetRow>[] = [
  {
    key: 'campaign',
    label: 'Campaña',
    getOptions: (data) => Array.from(new Set(data.map(r => r.campaign_name).filter(Boolean))),
    matches: (row, val) => row.campaign_name === val,
  },
]

export function AdSetsTab() {
  const { selectedAccount, market } = useAccount()
  const { buildParams } = useDateRange()
  const { setSelectedRow } = useSelection()
  const [activeSeverity, setActiveSeverity] = useState<AuditSeverity | null>(null)

  const params = buildParams()
  const endpoint = selectedAccount
    ? `/accounts/${selectedAccount.account_id}/adsets?${params}`
    : ''

  const { data, loading } = useMetaApi<AdSetRow[]>(endpoint, !!selectedAccount)

  if (!selectedAccount) return <div className="tab-empty">Seleccioná una cuenta.</div>
  if (loading) return <SkeletonTable />

  const rows: AdSetRow[] = data ?? []
  const recommendations = auditRows(rows, 'adset', market)
  const healthSummary = getHealthSummary(rows, market)

  const activeSeverityIds = activeSeverity ? entityIdsWithSeverity(recommendations, activeSeverity) : null
  const visibleRows = activeSeverityIds ? rows.filter(r => activeSeverityIds.has(r.adset_id)) : rows

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
        searchPlaceholder="Buscar conjunto..."
        searchField={(r) => r.adset_name}
        onRowClick={(row) => setSelectedRow(row, 'adset')}
        recommendations={recommendations}
        getRowId={(r) => r.adset_id}
      />
    </div>
  )
}
