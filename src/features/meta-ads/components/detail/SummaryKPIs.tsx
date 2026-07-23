import { useEffect, useState } from 'react'
import type { InsightRow } from '../../types/meta'
import { extractResultado, extractLinkClicks, extractLinkCtr, extractRoas } from '../../types/meta'
import { fetchCpbc } from '../../lib/fetchCpbc'
import { SensitiveNumber } from '../common/SensitiveNumber'

interface SummaryKPIsProps {
  row: InsightRow | null
  // CPBC needs the account name (for the same Torii/client matching
  // AccountContext.tsx already does) and a concrete date range — see
  // fetchCpbc.ts. Optional so this component still degrades gracefully
  // (no CPBC card) if a caller doesn't have them handy.
  accountName?: string
  since?: string
  until?: string
}

export function SummaryKPIs({ row, accountName, since, until }: SummaryKPIsProps) {
  const [cpbc, setCpbc] = useState<number | null>(null)
  const [cpbcLoading, setCpbcLoading] = useState(false)

  useEffect(() => {
    if (!row || !accountName || !since || !until) {
      setCpbc(null)
      return
    }
    let cancelled = false
    setCpbcLoading(true)
    fetchCpbc(accountName, row.spend, since, until)
      .then((value) => { if (!cancelled) setCpbc(value) })
      .catch((err) => {
        console.error('[SummaryKPIs] CPBC fetch failed:', err)
        if (!cancelled) setCpbc(null)
      })
      .finally(() => { if (!cancelled) setCpbcLoading(false) })
    return () => { cancelled = true }
  }, [row, accountName, since, until])

  if (!row) return null

  const spend     = parseFloat(row.spend || '0')
  const impressions = parseInt(row.impressions || '0', 10)
  // "Clics" KPI shows link clicks (matches Ads Manager's default Clicks
  // column). CTR keeps using all clicks, same as Meta's own `ctr` field.
  const totalClicks = parseInt(row.clicks || '0', 10)
  const clicks    = extractLinkClicks(row)
  const resultados = extractResultado(row)
  const ctr       = totalClicks > 0 && impressions > 0 ? (totalClicks / impressions) * 100 : parseFloat(row.ctr || '0')
  const ctrEnlace = extractLinkCtr(row)
  const cpm       = parseFloat(row.cpm || '0')
  const roas      = extractRoas(row)

  const kpis = [
    { label: 'Gasto',        value: spend,       format: 'currency' as const, sensitive: true },
    { label: 'Impresiones',  value: impressions, format: 'compact' as const },
    { label: 'Clics',        value: clicks,      format: 'compact' as const },
    { label: 'CTR',          value: ctr,         format: 'percent' as const },
    { label: 'CTR (enlace)', value: ctrEnlace,   format: 'percent' as const },
    { label: 'CPM',          value: cpm,         format: 'currency' as const, sensitive: true },
    { label: 'Resultados',   value: resultados,  format: 'number' as const },
    ...(cpbc != null ? [{ label: 'CPBC', value: cpbc, format: 'currency' as const, sensitive: true }] : []),
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
      {cpbcLoading && cpbc == null && (
        <div className="summary-kpi-item">
          <div className="summary-kpi-label">CPBC</div>
          <div className="summary-kpi-value text-muted-foreground text-sm">calculando…</div>
        </div>
      )}
    </div>
  )
}
