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
import type { Column } from '../common/DataTable'
import { SkeletonTable } from '../common/SkeletonLoader'
import { StatusBadge } from '../common/StatusBadge'
import { AuditSeverityBar } from '../common/AuditSeverityBar'
import { HealthBanner } from '../common/HealthBanner'
import { SensitiveNumber } from '../common/SensitiveNumber'
import { SensitiveText } from '../common/SensitiveText'
import { Sparkline } from '../common/Sparkline'
import { useSensitiveData } from '../../context/SensitiveDataContext'

type CampaignRow = InsightRow & {
  campaign_id: string
  campaign_name: string
  objective: string
  status: string
  effective_status: string
  sparkline?: number[]
}

const columns: Column<CampaignRow>[] = [
  {
    key: 'campaign_name', label: 'Campaña', priority: 'high',
    render: (r) => (
      <div className="name-cell">
        <SensitiveText>{r.campaign_name}</SensitiveText>
        {r.sparkline && r.sparkline.length > 1 && (
          <Sparkline data={r.sparkline} width={48} height={16} />
        )}
      </div>
    ),
    sortValue: (r) => r.campaign_name,
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

export function CampaignsTab() {
  const { selectedAccount } = useAccount()
  const { buildParams } = useDateRange()
  const { setSelectedRow } = useSelection()
  const { isHidden } = useSensitiveData()
  void isHidden
  const [activeSeverity, setActiveSeverity] = useState<AuditSeverity | null>(null)

  const params = buildParams()
  const endpoint = selectedAccount
    ? `/accounts/${selectedAccount.account_id}/campaigns?${params}`
    : ''

  const { data, loading } = useMetaApi<CampaignRow[]>(endpoint, !!selectedAccount)

  if (!selectedAccount) return <div className="tab-empty">Seleccioná una cuenta.</div>
  if (loading) return <SkeletonTable />

  const rows: CampaignRow[] = data ?? []
  const recommendations = auditRows(rows, 'campaign')
  const healthSummary = getHealthSummary(rows)

  const activeSeverityIds = activeSeverity ? entityIdsWithSeverity(recommendations, activeSeverity) : null
  const visibleRows = activeSeverityIds ? rows.filter(r => activeSeverityIds.has(r.campaign_id)) : rows

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
        searchPlaceholder="Buscar campaña..."
        searchField={(r) => r.campaign_name}
        onRowClick={(row) => setSelectedRow(row, 'campaign')}
      />
    </div>
  )
}
