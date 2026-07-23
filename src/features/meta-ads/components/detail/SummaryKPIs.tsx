import type { InsightRow } from '../../types/meta'
import { extractLeads, extractLinkClicks, extractCpl, extractRoas } from '../../types/meta'
import { SensitiveNumber } from '../common/SensitiveNumber'

interface SummaryKPIsProps {
  row: InsightRow | null
}

export function SummaryKPIs({ row }: SummaryKPIsProps) {
  if (!row) return null

  const spend     = parseFloat(row.spend || '0')
  const impressions = parseInt(row.impressions || '0', 10)
  // "Clics" KPI shows link clicks (matches Ads Manager's default Clicks
  // column). CTR keeps using all clicks, same as Meta's own `ctr` field.
  const totalClicks = parseInt(row.clicks || '0', 10)
  const clicks    = extractLinkClicks(row)
  const leads     = extractLeads(row)
  const cpl       = extractCpl(row) ?? (leads > 0 ? spend / leads : null)
  const ctr       = totalClicks > 0 && impressions > 0 ? (totalClicks / impressions) * 100 : parseFloat(row.ctr || '0')
  const cpm       = parseFloat(row.cpm || '0')
  const roas      = extractRoas(row)

  const kpis = [
    { label: 'Gasto',        value: spend,       format: 'currency' as const, sensitive: true },
    { label: 'Impresiones',  value: impressions, format: 'compact' as const },
    { label: 'Clics',        value: clicks,      format: 'compact' as const },
    { label: 'CTR',          value: ctr,         format: 'percent' as const },
    { label: 'CPM',          value: cpm,         format: 'currency' as const, sensitive: true },
    { label: 'Leads',        value: leads,       format: 'number' as const },
    ...(cpl != null ? [{ label: 'CPL', value: cpl, format: 'currency' as const, sensitive: true }] : []),
    ...(roas != null ? [{ label: 'ROAS', value: roas, format: 'number' as const }] : []),
  ]

  return (
    <div className="summary-kpis">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="summary-kpi-item">
          <div className="summary-kpi-label">{kpi.label}</div>
          <div className="summary-kpi-value">
            <SensitiveNumber value={kpi.value} format={kpi.format} />
          </div>
        </div>
      ))}
    </div>
  )
}
