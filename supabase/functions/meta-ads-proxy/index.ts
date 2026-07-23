import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const META_BASE = 'https://graph.facebook.com/v25.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// The only Meta ad account an 'auditor'-role user is allowed to touch —
// matches ads_campanas.ad_account_id for LM Social Constructions (confirmed
// against synced data; see 20260723130000_auditor_rls_policies.sql). RLS on
// ads_campanas/ads_metricas_diarias covers what's stored in our own DB, but
// this function talks to Meta's Graph API directly with a shared token, so
// it needs its own account_id check — Postgres RLS has no say over that.
const AUDITOR_ALLOWED_ACCOUNT_ID = '1151443753506231'

// Resolves whether the caller (from the request's JWT) has the 'auditor'
// role. Returns false — i.e. unrestricted, same as any other staff account
// — for anonymous callers, missing/invalid JWTs, or if the role lookup
// itself fails (network hiccup to the Auth/DB service). That fail-open
// choice is deliberate: failing closed here would take the whole proxy
// down for every regular user on any transient Supabase hiccup, to guard
// against a narrow edge case (an actual auditor briefly regaining access to
// other Meta accounts during that same hiccup). Postgres RLS on
// ads_campanas/ads_metricas_diarias is unaffected either way — it's
// enforced independently of this check.
async function callerIsAuditor(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Validates the JWT (signature + expiry) and recovers the caller's user
    // id — don't trust an unverified decode of the token payload.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return false

    // user_roles' own RLS only lets a user read their own rows, which would
    // work here too (the caller's JWT is attached) — service role is used
    // instead to make the check independent of that policy ever changing.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'auditor')
      .maybeSingle()

    return !error && !!data
  } catch {
    return false
  }
}

function normalizeAccountId(id: string): string {
  return id.startsWith('act_') ? id.slice(4) : id
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ─── Meta API helpers ─────────────────────────────────────────────────────────

interface MetaPage {
  data: unknown[]
  paging?: { next?: string }
  error?: { message: string; code: number }
}

async function fetchMeta(url: string): Promise<MetaPage> {
  const res = await fetch(url)
  const body: MetaPage = await res.json()
  if (body.error) throw new Error(`Meta API: ${body.error.message} (code ${body.error.code})`)
  if (!res.ok) throw new Error(`Meta API HTTP ${res.status}`)
  return body
}

// Follows paging.next until exhausted, capped at maxPages to stay within
// Supabase Edge Function's 30s timeout.
async function fetchAllPages(url: string, maxPages = 5): Promise<unknown[]> {
  const all: unknown[] = []
  let next: string | null = url
  let pages = 0
  while (next && pages < maxPages) {
    const body = await fetchMeta(next)
    all.push(...(body.data ?? []))
    next = body.paging?.next ?? null
    pages++
  }
  return all
}

// ─── Field builders ───────────────────────────────────────────────────────────

const BASE_FIELDS = 'spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,cost_per_action_type,purchase_roas'
const AD_FIELDS   = `${BASE_FIELDS},quality_ranking,engagement_rate_ranking,conversion_rate_ranking`

// Pins the attribution window for every actions-derived field (actions,
// cost_per_action_type) so leads/link_clicks match a fixed, known window
// instead of drifting with each account's own default — Ads Manager's
// visible columns can use a different default per account, which was
// causing our numbers to mismatch it.
const ATTRIBUTION_WINDOWS = JSON.stringify(['7d_click'])

function insightsNested(fields: string, datePreset?: string, since?: string, until?: string): string {
  if (since && until) {
    // Meta syntax: insights.time_range({"since":"...","until":"..."}){fields}
    return `insights.time_range(${JSON.stringify({ since, until })}){${fields}}`
  }
  return `insights.date_preset(${datePreset ?? 'last_14d'}){${fields}}`
}

// Same nested-expansion syntax as insightsNested(), but chains
// .time_increment(1) so `insights.data` comes back as one entry PER DAY
// instead of a single total for the whole period — used only by the
// background sync (campaigns_daily), never by the tabs' aggregated views.
function insightsNestedDaily(fields: string, datePreset?: string, since?: string, until?: string): string {
  const withDates = `${fields},date_start,date_stop`
  if (since && until) {
    return `insights.time_range(${JSON.stringify({ since, until })}).time_increment(1){${withDates}}`
  }
  return `insights.date_preset(${datePreset ?? 'last_14d'}).time_increment(1){${withDates}}`
}

function dateParams(datePreset?: string, since?: string, until?: string): Record<string, string> {
  if (since && until) return { time_range: JSON.stringify({ since, until }), time_increment: '1' }
  return { date_preset: datePreset ?? 'last_14d', time_increment: '1' }
}

// ─── Transform: Meta response → InsightRow (flat) ────────────────────────────

type Raw = Record<string, unknown>
type Ins  = Record<string, unknown>

function getIns(item: Raw): Ins {
  return ((item.insights as { data?: Ins[] } | undefined)?.data?.[0]) ?? {}
}

function baseMetrics(ins: Ins): Raw {
  return {
    spend:                  ins.spend                  ?? '0',
    impressions:            ins.impressions             ?? '0',
    reach:                  ins.reach                  ?? '0',
    frequency:              ins.frequency               ?? '0',
    clicks:                 ins.clicks                 ?? '0',
    ctr:                    ins.ctr                    ?? '0',
    cpc:                    ins.cpc                    ?? '0',
    cpm:                    ins.cpm                    ?? '0',
    actions:                ins.actions                ?? [],
    cost_per_action_type:   ins.cost_per_action_type   ?? [],
    purchase_roas:          ins.purchase_roas           ?? [],
  }
}

function transformCampaign(c: Raw): Raw {
  const ins = getIns(c)
  return {
    campaign_id:        c.id,
    campaign_name:      c.name,
    effective_status:   c.effective_status,
    status:             c.status,
    campaign_objective: c.objective,
    ...baseMetrics(ins),
  }
}

// Unlike transformCampaign(), insights.data here has one entry PER DAY
// (see insightsNestedDaily), so this returns an array — one row per
// campaign per day it had delivery. Days with zero activity are simply
// absent from Meta's response, not returned as zero rows.
function transformCampaignDaily(c: Raw): Raw[] {
  const insData = ((c.insights as { data?: Ins[] } | undefined)?.data) ?? []
  return insData.map((ins) => ({
    campaign_id:        c.id,
    campaign_name:      c.name,
    effective_status:   c.effective_status,
    status:             c.status,
    campaign_objective: c.objective,
    date_start:         ins.date_start,
    date_stop:          ins.date_stop,
    ...baseMetrics(ins),
  }))
}

function transformAdset(a: Raw): Raw {
  const ins = getIns(a)
  const camp = a.campaign as Raw | undefined
  return {
    adset_id:                a.id,
    adset_name:              a.name,
    effective_status:        a.effective_status,
    status:                  a.status,
    campaign_id:             a.campaign_id,
    campaign_name:           camp?.name ?? '',
    adset_optimization_goal: a.optimization_goal,
    adset_destination_type:  a.destination_type,
    ...baseMetrics(ins),
  }
}

function transformAd(a: Raw): Raw {
  const ins    = getIns(a)
  const adset  = a.adset as Raw | undefined
  const camp   = adset?.campaign as Raw | undefined
  return {
    ad_id:                      a.id,
    ad_name:                    a.name,
    effective_status:           a.effective_status,
    status:                     a.status,
    adset_id:                   a.adset_id,
    adset_name:                 adset?.name ?? '',
    campaign_id:                adset?.campaign_id ?? '',
    campaign_name:              camp?.name ?? '',
    quality_ranking:            ins.quality_ranking,
    engagement_rate_ranking:    ins.engagement_rate_ranking,
    conversion_rate_ranking:    ins.conversion_rate_ranking,
    ...baseMetrics(ins),
  }
}

function transformAccount(a: Raw): Raw {
  return {
    id:              a.id,
    name:            a.name,
    account_id:      a.account_id,
    account_status:  a.account_status,
    currency:        a.currency,
    timezone_name:   a.timezone_name,
    balance:         a.balance    ?? '0',
    amount_spent:    a.amount_spent ?? '0',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Meta Marketing API requires the "act_" prefix on ad account IDs for all
// account-scoped endpoints (/campaigns, /adsets, /ads, /insights).
function actId(id: string): string {
  return id.startsWith('act_') ? id : `act_${id}`
}

// ─── Date utilities for period comparison ─────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Convert a Meta date_preset to explicit since/until dates (today's perspective).
function presetToRange(preset: string): { since: string; until: string } {
  const today = new Date()
  const d = (n: number) => { const r = new Date(today); r.setDate(today.getDate() - n); return r }
  switch (preset) {
    case 'today':      return { since: fmtDate(today), until: fmtDate(today) }
    case 'yesterday':  return { since: fmtDate(d(1)),  until: fmtDate(d(1)) }
    case 'last_7d':    return { since: fmtDate(d(6)),  until: fmtDate(today) }
    case 'last_14d':   return { since: fmtDate(d(13)), until: fmtDate(today) }
    case 'last_30d':   return { since: fmtDate(d(29)), until: fmtDate(today) }
    case 'this_month': return {
      since: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      until: fmtDate(today),
    }
    case 'last_month': return {
      since: fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      until: fmtDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
    default: return { since: fmtDate(d(6)), until: fmtDate(today) }
  }
}

// Compute the previous period of the same duration, ending the day before the
// current period starts. Works for both presets and custom ranges.
function previousPeriod(preset: string, since?: string, until?: string): { since: string; until: string } {
  const curr = (since && until) ? { since, until } : presetToRange(preset)
  const s = new Date(curr.since)
  const e = new Date(curr.until)
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevUntil = new Date(s)
  prevUntil.setDate(s.getDate() - 1)
  const prevSince = new Date(prevUntil)
  prevSince.setDate(prevUntil.getDate() - days + 1)
  return { since: fmtDate(prevSince), until: fmtDate(prevUntil) }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const token = Deno.env.get('META_ACCESS_TOKEN')
  if (!token) return json({ error: 'META_ACCESS_TOKEN not configured' }, 500)

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }

  const { type, account_id, entity_id, level, date_preset, since, until, compare } = body

  const isAuditor = await callerIsAuditor(req)

  // Every case below either takes an explicit account_id, or (accounts,
  // timeseries at account level) an equivalent account identifier — checked
  // against AUDITOR_ALLOWED_ACCOUNT_ID for auditor callers before any Meta
  // call is made. NOTE: 'timeseries' at campaign/adset/ad level takes an
  // entity_id instead, which this function has no way to resolve to an
  // account without an extra Meta lookup — a known, documented gap, not
  // covered by this check.
  if (isAuditor && account_id && normalizeAccountId(account_id) !== AUDITOR_ALLOWED_ACCOUNT_ID) {
    return json({ error: 'Forbidden: auditor role is scoped to a single ad account' }, 403)
  }
  if (isAuditor && type === 'timeseries' && level === 'account' && entity_id && normalizeAccountId(entity_id) !== AUDITOR_ALLOWED_ACCOUNT_ID) {
    return json({ error: 'Forbidden: auditor role is scoped to a single ad account' }, 403)
  }

  try {
    switch (type) {

      // ── /me/adaccounts ──────────────────────────────────────────────────────
      case 'accounts': {
        const u = new URL(`${META_BASE}/me/adaccounts`)
        u.searchParams.set('fields', 'id,name,account_id,account_status,currency,timezone_name,balance,amount_spent')
        u.searchParams.set('access_token', token)
        const items = await fetchAllPages(u.toString()) as Raw[]
        const accounts = items.map(transformAccount)
        // Auditor never sees that other accounts exist, not even their names.
        const visible = isAuditor
          ? accounts.filter((a) => normalizeAccountId(String(a.account_id ?? '')) === AUDITOR_ALLOWED_ACCOUNT_ID)
          : accounts
        return json({ data: visible })
      }

      // ── /{account_id}/campaigns ─────────────────────────────────────────────
      case 'campaigns': {
        if (!account_id) return json({ error: 'account_id is required' }, 400)
        const nested = insightsNested(BASE_FIELDS, date_preset, since, until)
        const u = new URL(`${META_BASE}/${actId(account_id)}/campaigns`)
        u.searchParams.set('fields', `id,name,effective_status,status,objective,${nested}`)
        u.searchParams.set('limit', '100')
        u.searchParams.set('action_attribution_windows', ATTRIBUTION_WINDOWS)
        u.searchParams.set('access_token', token)
        const items = await fetchAllPages(u.toString()) as Raw[]
        return json({ data: items.map(transformCampaign) })
      }

      // ── /{account_id}/campaigns with daily insights ─────────────────────────
      // Independent of the 'campaigns' case above (which collapses the whole
      // selected period into one aggregated row per campaign, with no date to
      // key a daily table by). Used only by the background Supabase sync.
      case 'campaigns_daily': {
        if (!account_id) return json({ error: 'account_id is required' }, 400)
        const nested = insightsNestedDaily(BASE_FIELDS, date_preset, since, until)
        const u = new URL(`${META_BASE}/${actId(account_id)}/campaigns`)
        u.searchParams.set('fields', `id,name,effective_status,status,objective,${nested}`)
        u.searchParams.set('limit', '100')
        u.searchParams.set('action_attribution_windows', ATTRIBUTION_WINDOWS)
        u.searchParams.set('access_token', token)
        const items = await fetchAllPages(u.toString()) as Raw[]
        return json({ data: items.flatMap(transformCampaignDaily) })
      }

      // ── /{account_id}/adsets ────────────────────────────────────────────────
      case 'adsets': {
        if (!account_id) return json({ error: 'account_id is required' }, 400)
        const nested = insightsNested(BASE_FIELDS, date_preset, since, until)
        const u = new URL(`${META_BASE}/${actId(account_id)}/adsets`)
        u.searchParams.set('fields', `id,name,effective_status,status,campaign_id,campaign{name},optimization_goal,destination_type,${nested}`)
        u.searchParams.set('limit', '200')
        u.searchParams.set('action_attribution_windows', ATTRIBUTION_WINDOWS)
        u.searchParams.set('access_token', token)
        const items = await fetchAllPages(u.toString()) as Raw[]
        return json({ data: items.map(transformAdset) })
      }

      // ── /{account_id}/ads ───────────────────────────────────────────────────
      case 'ads': {
        if (!account_id) return json({ error: 'account_id is required' }, 400)
        const nested = insightsNested(AD_FIELDS, date_preset, since, until)
        const u = new URL(`${META_BASE}/${actId(account_id)}/ads`)
        u.searchParams.set('fields', `id,name,effective_status,status,adset_id,adset{name,campaign_id,campaign{name}},${nested}`)
        u.searchParams.set('limit', '200')
        u.searchParams.set('action_attribution_windows', ATTRIBUTION_WINDOWS)
        u.searchParams.set('access_token', token)
        const items = await fetchAllPages(u.toString()) as Raw[]
        return json({ data: items.map(transformAd) })
      }

      // ── /{entity_id}/insights?time_increment=1 ──────────────────────────────
      // entity_id can be an ad account ID (numeric or act_XXX), campaign_id,
      // adset_id, or ad_id. For account-level queries (level === 'account'),
      // normalize to act_ prefix. Campaign/adset/ad IDs are bare numerics.
      //
      // When compare='previous' is sent, a second fetch for the prior period of
      // equal duration is executed in parallel and returned as compareData.
      case 'timeseries': {
        if (!entity_id) return json({ error: 'entity_id is required' }, 400)
        const resolvedId = level === 'account' ? actId(entity_id) : entity_id
        const fields = 'spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,cost_per_action_type'
        const dp = dateParams(date_preset, since, until)

        const buildUrl = (params: Record<string, string>) => {
          const u = new URL(`${META_BASE}/${resolvedId}/insights`)
          u.searchParams.set('fields', fields)
          u.searchParams.set('time_increment', '1')
          u.searchParams.set('action_attribution_windows', ATTRIBUTION_WINDOWS)
          for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
          u.searchParams.set('access_token', token)
          return u.toString()
        }

        if (compare === 'previous') {
          const prev = previousPeriod(date_preset, since, until)
          const prevParams = { since: prev.since, until: prev.until, time_increment: '1' }
          const [current, compareRows] = await Promise.all([
            fetchAllPages(buildUrl(dp)),
            fetchAllPages(buildUrl(prevParams)),
          ])
          return json({ data: current, compareData: compareRows })
        }

        const items = await fetchAllPages(buildUrl(dp))
        return json({ data: items })
      }

      default:
        return json({ error: `Unknown type: "${type}"` }, 400)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[meta-ads-proxy] ${type} failed:`, msg)
    return json({ error: msg }, 502)
  }
})
