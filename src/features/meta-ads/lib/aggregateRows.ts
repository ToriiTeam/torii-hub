import type { InsightRow } from '../types/meta'

/**
 * Collapses an array of rows (daily timeseries rows or per-campaign/adset/ad
 * rows) into a single InsightRow representing the totals for the period.
 *
 * Summed:  spend, impressions, reach, clicks, actions
 * Derived: ctr, cpc, cpm, frequency (recomputed from totals, not averaged)
 * cost_per_action_type: recomputed as total_spend / total_action_count
 */
export function aggregateRows(rows: InsightRow[]): InsightRow | null {
  if (!rows.length) return null

  let spend = 0, impressions = 0, reach = 0, clicks = 0
  const actionsMap = new Map<string, number>()

  for (const row of rows) {
    spend       += parseFloat(row.spend       || '0')
    impressions += parseInt(row.impressions   || '0', 10)
    reach       += parseInt(row.reach         || '0', 10)
    clicks      += parseInt(row.clicks        || '0', 10)

    for (const a of row.actions ?? []) {
      actionsMap.set(a.action_type, (actionsMap.get(a.action_type) ?? 0) + parseFloat(a.value))
    }
  }

  const actions = Array.from(actionsMap.entries()).map(([action_type, v]) => ({
    action_type,
    value: v.toFixed(0),
  }))

  // Recompute cost_per_action as total spend / total action count
  const cost_per_action_type = actions
    .filter(a => parseFloat(a.value) > 0)
    .map(a => ({
      action_type: a.action_type,
      value: (spend / parseFloat(a.value)).toFixed(2),
    }))

  const ctr       = impressions > 0 ? (clicks / impressions) * 100        : 0
  const cpc       = clicks > 0      ? spend / clicks                       : 0
  const cpm       = impressions > 0 ? spend / (impressions / 1000)         : 0
  const frequency = reach > 0       ? impressions / reach                  : 0

  return {
    spend:               spend.toFixed(2),
    impressions:         impressions.toString(),
    reach:               reach.toString(),
    frequency:           frequency.toFixed(6),
    clicks:              clicks.toString(),
    ctr:                 ctr.toFixed(6),
    cpc:                 cpc.toFixed(6),
    cpm:                 cpm.toFixed(6),
    actions,
    cost_per_action_type,
    purchase_roas: [],
  }
}
