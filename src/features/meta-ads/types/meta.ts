export interface AdAccount {
  id: string
  name: string
  account_id: string
  account_status: number
  currency: string
  timezone_name: string
  balance: string
  amount_spent: string
}

export interface MetaAction {
  action_type: string
  value: string
}

export interface InsightRow {
  campaign_name?: string
  campaign_id?: string
  adset_name?: string
  adset_id?: string
  ad_name?: string
  ad_id?: string
  spend: string
  impressions: string
  reach: string
  frequency: string
  clicks: string
  ctr: string
  cpc: string
  cpm: string
  actions?: MetaAction[]
  action_values?: MetaAction[]
  cost_per_action_type?: MetaAction[]
  purchase_roas?: MetaAction[]
  quality_ranking?: string
  engagement_rate_ranking?: string
  conversion_rate_ranking?: string
  campaign_objective?: string
  adset_optimization_goal?: string
  adset_destination_type?: string
}

export interface TimeseriesInsightRow extends InsightRow {
  date_start: string
  date_stop: string
}

export type TabLevel = 'campaign' | 'adset' | 'ad'

export interface DateRange {
  since: string
  until: string
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'this_month'
  | 'last_month'

export function extractAction(actions: MetaAction[] | undefined, actionType: string): number {
  if (!actions) return 0
  const found = actions.find((a) => a.action_type === actionType)
  return found ? parseFloat(found.value) : 0
}

export function extractPurchases(row: InsightRow): number {
  return (
    extractAction(row.actions, 'purchase') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_purchase') ||
    extractAction(row.actions, 'omni_purchase')
  )
}

export function extractPurchaseValue(row: InsightRow): number {
  return (
    extractAction(row.action_values, 'purchase') ||
    extractAction(row.action_values, 'offsite_conversion.fb_pixel_purchase') ||
    extractAction(row.action_values, 'omni_purchase')
  )
}

export function extractCostPerPurchase(row: InsightRow): number {
  return (
    extractAction(row.cost_per_action_type, 'purchase') ||
    extractAction(row.cost_per_action_type, 'offsite_conversion.fb_pixel_purchase') ||
    extractAction(row.cost_per_action_type, 'omni_purchase')
  )
}

export function extractRoas(row: InsightRow): number {
  if (row.purchase_roas && row.purchase_roas.length > 0) {
    return parseFloat(row.purchase_roas[0].value) || 0
  }
  return 0
}

export function extractAddToCart(row: InsightRow): number {
  return (
    extractAction(row.actions, 'add_to_cart') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_add_to_cart') ||
    extractAction(row.actions, 'omni_add_to_cart')
  )
}

export function extractInitiateCheckout(row: InsightRow): number {
  return (
    extractAction(row.actions, 'initiate_checkout') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_initiate_checkout') ||
    extractAction(row.actions, 'omni_initiated_checkout')
  )
}

export function extractLeads(row: InsightRow): number {
  return (
    extractAction(row.actions, 'lead') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_lead') ||
    extractAction(row.actions, 'omni_lead')
  )
}

export function extractCostPerLead(row: InsightRow): number {
  return (
    extractAction(row.cost_per_action_type, 'lead') ||
    extractAction(row.cost_per_action_type, 'offsite_conversion.fb_pixel_lead') ||
    extractAction(row.cost_per_action_type, 'omni_lead')
  )
}

export function extractCpl(row: InsightRow): number | null {
  const cpl = extractCostPerLead(row)
  return cpl > 0 ? cpl : null
}

export function extractMessages(row: InsightRow): number {
  return (
    extractAction(row.actions, 'onsite_conversion.messaging_first_reply') ||
    extractAction(row.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
    extractAction(row.actions, 'on_facebook_messaging_first_reply')
  )
}

export function extractCostPerMessage(row: InsightRow): number {
  return (
    extractAction(row.cost_per_action_type, 'onsite_conversion.messaging_first_reply') ||
    extractAction(row.cost_per_action_type, 'onsite_conversion.messaging_conversation_started_7d') ||
    extractAction(row.cost_per_action_type, 'on_facebook_messaging_first_reply')
  )
}

export interface PrimaryResult {
  objective: 'sales' | 'leads' | 'messages' | 'awareness' | 'other'
  value: number
  cost: number
  label: string
  costLabel: string
}

function classifyObjective(row: InsightRow): PrimaryResult['objective'] {
  const obj = (row.campaign_objective || '').toUpperCase()
  const optGoal = (row.adset_optimization_goal || '').toUpperCase()
  const dest = (row.adset_destination_type || '').toUpperCase()

  if (obj.includes('SALES') || obj === 'CONVERSIONS' || obj === 'PRODUCT_CATALOG_SALES') return 'sales'
  if (obj.includes('LEAD') || optGoal.includes('LEAD')) return 'leads'
  if (obj.includes('MESSAGE') || dest === 'MESSENGER' || dest === 'WHATSAPP' || optGoal === 'CONVERSATIONS') return 'messages'
  if (obj.includes('AWARENESS') || obj.includes('REACH') || obj === 'BRAND_AWARENESS') return 'awareness'

  if (extractPurchases(row) > 0) return 'sales'
  if (extractLeads(row) > 0) return 'leads'
  if (extractMessages(row) > 0) return 'messages'

  return 'other'
}

export function getPrimaryResult(row: InsightRow): PrimaryResult {
  const objective = classifyObjective(row)

  switch (objective) {
    case 'sales':
      return {
        objective,
        value: extractPurchases(row),
        cost: extractCostPerPurchase(row),
        label: 'Compras',
        costLabel: 'Costo/Compra',
      }
    case 'leads':
      return {
        objective,
        value: extractLeads(row),
        cost: extractCostPerLead(row),
        label: 'Leads',
        costLabel: 'Costo/Lead',
      }
    case 'messages':
      return {
        objective,
        value: extractMessages(row),
        cost: extractCostPerMessage(row),
        label: 'Mensajes',
        costLabel: 'Costo/Mensaje',
      }
    case 'awareness':
      return {
        objective,
        value: parseFloat(row.reach) || 0,
        cost: parseFloat(row.cpm) || 0,
        label: 'Alcance',
        costLabel: 'CPM',
      }
    default:
      return {
        objective: 'other',
        value: extractAction(row.actions, 'link_click') || parseFloat(row.clicks) || 0,
        cost: parseFloat(row.cpc) || 0,
        label: 'Clicks',
        costLabel: 'CPC',
      }
  }
}
