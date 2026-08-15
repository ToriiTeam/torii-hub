import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ─── Backfill histórico ÚNICO (no cron) para un cliente puntual, dado un
// since explícito (fecha real de activación de campaña — NUNCA
// client.start_date, que puede estar vacío o no reflejar cuándo arrancaron
// los anuncios de verdad). Trocea el rango en bloques de máximo 90 días
// antes de llamar a meta-ads-proxy, siguiendo la recomendación de la doc de
// Meta ("Limits & Best Practices") para evitar el error 1487534
// (demasiadas filas/data points en una sola respuesta con time_increment=1
// sobre un rango largo) y timeouts en llamadas síncronas.
//
// Mismo upsert que meta-ads-daily-sync (duplicado acá, no importado — Deno
// no puede compartir código entre Edge Functions vía import relativo fuera
// del bundle de cada función sin un módulo _shared/, que este proyecto no
// usa todavía; se mantiene el mismo criterio ya establecido en
// meta-ads-daily-sync de portar la lógica en vez de inventar un mecanismo
// de compartición nuevo). Si esta lógica cambia en un lado, replicar en el
// otro.
// ────────────────────────────────────────────────────────────────────────

interface MetaAction { action_type: string; value: string }

interface DailyCampaignRow {
  campaign_id: string
  campaign_name: string
  effective_status?: string
  status?: string
  campaign_objective?: string
  date_start: string
  date_stop: string
  spend: string
  impressions: string
  reach: string
  frequency: string
  clicks: string
  ctr: string
  cpc: string
  cpm: string
  actions?: MetaAction[]
  cost_per_action_type?: MetaAction[]
  adset_optimization_goal?: string
  adset_destination_type?: string
}

function extractAction(actions: MetaAction[] | undefined, actionType: string): number {
  if (!actions) return 0
  const found = actions.find((a) => a.action_type === actionType)
  return found ? parseFloat(found.value) : 0
}

function extractLinkClicks(row: DailyCampaignRow): number {
  return extractAction(row.actions, 'link_click')
}

function extractPurchases(row: DailyCampaignRow): number {
  return (
    extractAction(row.actions, 'purchase') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_purchase') ||
    extractAction(row.actions, 'omni_purchase')
  )
}

function extractResultado(row: DailyCampaignRow): number {
  return (
    extractAction(row.actions, 'lead') ||
    extractAction(row.actions, 'onsite_conversion.lead_grouped') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_lead') ||
    extractAction(row.actions, 'omni_lead') ||
    extractAction(row.actions, 'offsite_conversion.fb_pixel_custom')
  )
}

function extractMessages(row: DailyCampaignRow): number {
  return (
    extractAction(row.actions, 'onsite_conversion.messaging_first_reply') ||
    extractAction(row.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
    extractAction(row.actions, 'on_facebook_messaging_first_reply')
  )
}

function primaryResultValue(row: DailyCampaignRow): number {
  const obj = (row.campaign_objective || '').toUpperCase()
  const optGoal = (row.adset_optimization_goal || '').toUpperCase()
  const dest = (row.adset_destination_type || '').toUpperCase()

  let objective: 'sales' | 'leads' | 'messages' | 'awareness' | 'other'
  if (obj.includes('SALES') || obj === 'CONVERSIONS' || obj === 'PRODUCT_CATALOG_SALES') objective = 'sales'
  else if (obj.includes('LEAD') || optGoal.includes('LEAD')) objective = 'leads'
  else if (obj.includes('MESSAGE') || dest === 'MESSENGER' || dest === 'WHATSAPP' || optGoal === 'CONVERSATIONS') objective = 'messages'
  else if (obj.includes('AWARENESS') || obj.includes('REACH') || obj === 'BRAND_AWARENESS') objective = 'awareness'
  else if (extractPurchases(row) > 0) objective = 'sales'
  else if (extractResultado(row) > 0) objective = 'leads'
  else if (extractMessages(row) > 0) objective = 'messages'
  else objective = 'other'

  switch (objective) {
    case 'sales': return extractPurchases(row)
    case 'leads': return extractResultado(row)
    case 'messages': return extractMessages(row)
    case 'awareness': return parseFloat(row.reach) || 0
    default: return extractAction(row.actions, 'link_click') || parseFloat(row.clicks) || 0
  }
}

function mapMetaStatusToEstado(metaStatus: string): string {
  const s = metaStatus.toUpperCase()
  if (s === 'ACTIVE') return 'activa'
  if (s === 'PAUSED' || s === 'CAMPAIGN_PAUSED' || s === 'ADSET_PAUSED') return 'pausada'
  if (s === 'DELETED' || s === 'ARCHIVED') return 'finalizada'
  return 'borrador'
}

// deno-lint-ignore no-explicit-any
async function upsertCampaignsDaily(supabase: any, rows: DailyCampaignRow[], clientId: string, accountId: string): Promise<number> {
  if (rows.length === 0) return 0

  const campaignsByCampaignId = new Map<string, { campaign_id: string; nombre: string; estado: string }>()
  for (const row of rows) {
    campaignsByCampaignId.set(row.campaign_id, {
      campaign_id: row.campaign_id,
      nombre: row.campaign_name,
      estado: mapMetaStatusToEstado(row.effective_status || row.status || ''),
    })
  }
  const campaignsPayload = Array.from(campaignsByCampaignId.values()).map((c) => ({
    ...c,
    client_id: clientId,
    ad_account_id: accountId,
  }))

  const { data: upserted, error: campErr } = await supabase
    .from('ads_campanas')
    .upsert(campaignsPayload, { onConflict: 'campaign_id' })
    .select('id, campaign_id')
  if (campErr) throw new Error(`ads_campanas upsert: ${campErr.message}`)

  const campanaIdByCampaignId = new Map<string, string>(
    // deno-lint-ignore no-explicit-any
    (upserted ?? []).map((c: any) => [c.campaign_id as string, c.id]),
  )

  const metricsPayload = rows
    .map((row) => {
      const campanaId = campanaIdByCampaignId.get(row.campaign_id)
      if (!campanaId) return null
      return {
        campana_id: campanaId,
        fecha: row.date_start,
        inversion: parseFloat(row.spend) || 0,
        impresiones: parseInt(row.impressions, 10) || 0,
        alcance: parseInt(row.reach, 10) || 0,
        clics: extractLinkClicks(row),
        ctr: parseFloat(row.ctr) || 0,
        cpc: parseFloat(row.cpc) || 0,
        cpm: parseFloat(row.cpm) || 0,
        leads: extractResultado(row),
        conversiones: Math.round(primaryResultValue(row)),
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (metricsPayload.length === 0) return 0

  const { error: metricsErr } = await supabase
    .from('ads_metricas_diarias')
    .upsert(metricsPayload, { onConflict: 'campana_id,fecha' })
  if (metricsErr) throw new Error(`ads_metricas_diarias upsert: ${metricsErr.message}`)

  return metricsPayload.length
}

// ─── Rango de fechas: hoy - 1 (día cerrado), y troceo en bloques ─────────

function yesterdayIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Bloques inclusivos de máximo maxDays días cada uno, cubriendo [since, until].
function chunkDateRange(since: string, until: string, maxDays = 90): { since: string; until: string }[] {
  const chunks: { since: string; until: string }[] = []
  let chunkStart = since
  while (chunkStart <= until) {
    let chunkEnd = addDaysIso(chunkStart, maxDays - 1)
    if (chunkEnd > until) chunkEnd = until
    chunks.push({ since: chunkStart, until: chunkEnd })
    chunkStart = addDaysIso(chunkEnd, 1)
  }
  return chunks
}

interface BlockResult {
  since: string
  until: string
  ok: boolean
  rows_synced?: number
  error?: string
  error_code_190?: boolean
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let body: { client_id?: string; since?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }
  if (!body.client_id) return json({ error: 'client_id is required' }, 400)
  if (!body.since) return json({ error: 'since (YYYY-MM-DD) is required — fecha real de activación de campaña, no client.start_date' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, meta_ad_account_id')
    .eq('id', body.client_id)
    .single()
  if (clientErr || !client) return json({ error: `Cliente no encontrado: ${clientErr?.message ?? body.client_id}` }, 404)
  if (!client.meta_ad_account_id) return json({ error: `${client.name} no tiene meta_ad_account_id cargado` }, 400)

  const until = yesterdayIso()
  if (body.since > until) return json({ error: `since (${body.since}) es posterior a ayer (${until})` }, 400)

  const blocks = chunkDateRange(body.since, until, 90)
  const accountId = client.meta_ad_account_id as string
  const results: BlockResult[] = []

  // Secuencial, mismo criterio que meta-ads-daily-sync: sin backoff de
  // rate-limit en ninguna capa, no bursteamos varios bloques en paralelo.
  for (const block of blocks) {
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('meta-ads-proxy', {
        body: { type: 'campaigns_daily', account_id: accountId, since: block.since, until: block.until },
      })
      if (invokeErr) throw new Error(invokeErr.message ?? String(invokeErr))
      if (data?.error) throw new Error(String(data.error))

      const rows: DailyCampaignRow[] = data?.data ?? []
      const rowsSynced = await upsertCampaignsDaily(supabase, rows, client.id, accountId)

      results.push({ since: block.since, until: block.until, ok: true, rows_synced: rowsSynced })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({
        since: block.since,
        until: block.until,
        ok: false,
        error: msg,
        error_code_190: /\(code 190\)/.test(msg),
      })
      console.error(`[meta-ads-backfill] client ${client.name} block ${block.since}..${block.until} failed:`, msg)
    }
  }

  const okBlocks = results.filter((r) => r.ok).length
  const totalRowsSynced = results.reduce((sum, r) => sum + (r.rows_synced ?? 0), 0)

  return json({
    client_id: client.id,
    client_name: client.name,
    since: body.since,
    until,
    blocks_total: blocks.length,
    blocks_ok: okBlocks,
    blocks_error: blocks.length - okBlocks,
    total_rows_synced: totalRowsSynced,
    results,
  })
})
