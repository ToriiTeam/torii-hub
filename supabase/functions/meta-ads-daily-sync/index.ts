import { createClient, FunctionsHttpError } from 'https://esm.sh/@supabase/supabase-js@2'

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

// ─── Ported from src/features/meta-ads/lib/syncMetaToSupabase.ts and
// src/features/meta-ads/types/meta.ts — this function runs in Deno
// (Edge Function), so it can't import those browser-side files directly
// (they pull in the browser supabase client via a relative path outside
// this function's bundle). Kept behaviorally identical; if the upsert
// logic there ever changes, mirror the change here too.
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

// Same objective→primary-result classification as getPrimaryResult() in
// types/meta.ts, trimmed to just the "value" side (conversiones) since
// that's all upsertCampaignsDaily() reads from it.
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
async function upsertCampaignsDaily(supabase: any, rows: DailyCampaignRow[], clientId: string, accountId: string): Promise<void> {
  if (rows.length === 0) return

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

  if (metricsPayload.length === 0) return

  const { error: metricsErr } = await supabase
    .from('ads_metricas_diarias')
    .upsert(metricsPayload, { onConflict: 'campana_id,fecha' })
  if (metricsErr) throw new Error(`ads_metricas_diarias upsert: ${metricsErr.message}`)
}

// ─── Date: yesterday, as a closed/complete UTC day ───────────────────────
function yesterdayIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface ClientResult {
  client_id: string
  client_name: string
  ok: boolean
  rows_synced?: number
  error?: string
  error_code_190?: boolean
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, name, meta_ad_account_id')
    .eq('status', 'active')
    .not('meta_ad_account_id', 'is', null)

  if (clientsErr) return json({ error: `No se pudo leer clients: ${clientsErr.message}` }, 500)

  const date = yesterdayIso()
  const results: ClientResult[] = []

  // Sequential, not parallel: neither this function nor meta-ads-proxy has
  // any rate-limit backoff today (confirmed absent in both), so this avoids
  // bursting several accounts' worth of Graph API calls at once.
  for (const client of clients ?? []) {
    const accountId = client.meta_ad_account_id as string
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('meta-ads-proxy', {
        body: { type: 'campaigns_daily', account_id: accountId, since: date, until: date },
      })
      if (invokeErr) {
        // invokeErr.message del cliente de supabase-js es siempre el string
        // genérico "Edge Function returned a non-2xx status code" — el
        // mensaje real que meta-ads-proxy manda en su body ({ error: msg })
        // solo está disponible parseando invokeErr.context (el Response
        // crudo), igual que en src/features/meta-ads/context/AccountContext.tsx.
        // Sin esto, error_code_190 más abajo nunca matcheaba porque el texto
        // real ("(code 190)") nunca llegaba a la variable `msg`.
        let realMsg = invokeErr.message ?? String(invokeErr)
        if (invokeErr instanceof FunctionsHttpError) {
          try {
            const body = await invokeErr.context.json()
            if (body?.error) realMsg = body.error
          } catch {
            // body no era JSON o ya fue consumido — nos quedamos con invokeErr.message
          }
        }
        throw new Error(realMsg)
      }
      if (data?.error) throw new Error(String(data.error))

      const rows: DailyCampaignRow[] = data?.data ?? []
      await upsertCampaignsDaily(supabase, rows, client.id, accountId)

      results.push({ client_id: client.id, client_name: client.name, ok: true, rows_synced: rows.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({
        client_id: client.id,
        client_name: client.name,
        ok: false,
        error: msg,
        error_code_190: /\(code 190\)/.test(msg),
      })
      console.error(`[meta-ads-daily-sync] client ${client.name} (${client.id}) failed:`, msg)
    }
  }

  const okCount = results.filter((r) => r.ok).length
  const errorCount = results.length - okCount
  const hasTokenError = results.some((r) => r.error_code_190 === true)

  // Registrado siempre, sin importar cuántos clientes fallaron — el
  // objetivo de esta tabla es justamente que un fallo (sobre todo un token
  // vencido) quede visible en el Hub en vez de perderse en estos logs.
  const { error: runErr } = await supabase.from('meta_sync_runs').insert({
    ok_count: okCount,
    error_count: errorCount,
    results,
    has_token_error: hasTokenError,
  })
  if (runErr) console.error('[meta-ads-daily-sync] failed to record meta_sync_runs:', runErr.message)

  return json({
    date,
    ok_count: okCount,
    error_count: errorCount,
    results,
  })
})
