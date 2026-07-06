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

// GHL API v2 (LeadConnector). UNVERIFIED against a live account — built from
// documented v2 conventions since no GHL credential exists in this project
// yet (see conversation: the only prior GHL integration, ghl-appointment-
// webhook, is inbound-only and never calls GHL's API). Once GHL_API_KEY /
// GHL_LOCATION_ID are set, smoke-test this against the real account and
// adjust field names/endpoints if GHL's actual response shape differs.
const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'
const TARGET_TAG = 'sv-cliente-activo'
const FECHA_ULTIMA_COMPRA_FIELD_NAME = 'sv_fecha_ultima_compra'

interface GhlCustomField {
  id: string
  name: string
  fieldKey?: string
}

interface GhlContactCustomFieldValue {
  id: string
  value?: string
}

interface GhlContact {
  id: string
  firstName?: string
  lastName?: string
  contactName?: string
  email?: string
  phone?: string
  customFields?: GhlContactCustomFieldValue[]
}

function ghlHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
  }
}

// Custom fields are referenced by an opaque ID in the API, not by their
// human-readable name — resolve sv_fecha_ultima_compra's ID by name instead
// of hardcoding it, so this doesn't break if the field is ever recreated.
async function resolveCustomFieldId(apiKey: string, locationId: string): Promise<string | null> {
  const res = await fetch(`${GHL_BASE}/locations/${locationId}/customFields`, {
    headers: ghlHeaders(apiKey),
  })
  if (!res.ok) {
    console.error('[ghl-mc-clients] failed to list custom fields:', res.status, await res.text())
    return null
  }
  const body = await res.json()
  const fields: GhlCustomField[] = body.customFields ?? []
  const match = fields.find(
    (f) => f.name === FECHA_ULTIMA_COMPRA_FIELD_NAME || f.fieldKey?.endsWith(FECHA_ULTIMA_COMPRA_FIELD_NAME),
  )
  return match?.id ?? null
}

// Paginates GHL's contact search (tag-filtered), capped to stay within the
// edge function's execution window.
async function searchContactsByTag(apiKey: string, locationId: string, tag: string, maxPages = 10): Promise<GhlContact[]> {
  const all: GhlContact[] = []
  let page = 1
  while (page <= maxPages) {
    const res = await fetch(`${GHL_BASE}/contacts/search`, {
      method: 'POST',
      headers: ghlHeaders(apiKey),
      body: JSON.stringify({
        locationId,
        page,
        pageLimit: 100,
        filters: [{ field: 'tags', operator: 'contains', value: tag }],
      }),
    })
    if (!res.ok) {
      throw new Error(`GHL contacts/search failed: ${res.status} ${await res.text()}`)
    }
    const body = await res.json()
    const contacts: GhlContact[] = body.contacts ?? []
    all.push(...contacts)
    if (contacts.length < 100) break
    page++
  }
  return all
}

function contactName(c: GhlContact): string {
  if (c.contactName) return c.contactName
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GHL_API_KEY')
  const locationId = Deno.env.get('GHL_LOCATION_ID')
  if (!apiKey || !locationId) {
    console.error('[ghl-mc-clients] GHL_API_KEY / GHL_LOCATION_ID not configured')
    return json(
      { error: 'GHL_API_KEY y/o GHL_LOCATION_ID no están configuradas. Corré: supabase secrets set GHL_API_KEY=... GHL_LOCATION_ID=...' },
      500,
    )
  }

  try {
    const fieldId = await resolveCustomFieldId(apiKey, locationId)
    const contacts = await searchContactsByTag(apiKey, locationId, TARGET_TAG)

    const data = contacts.map((c) => {
      const fechaUltimaCompra = fieldId
        ? c.customFields?.find((f) => f.id === fieldId)?.value ?? null
        : null
      return {
        ghl_contact_id: c.id,
        name: contactName(c),
        email: c.email ?? null,
        phone: c.phone ?? null,
        fecha_ultima_compra: fechaUltimaCompra,
      }
    })

    if (!fieldId) {
      console.warn(`[ghl-mc-clients] could not resolve custom field "${FECHA_ULTIMA_COMPRA_FIELD_NAME}" — fecha_ultima_compra will be null for all contacts`)
    }

    return json({ data, warning: fieldId ? null : `No se encontró el custom field "${FECHA_ULTIMA_COMPRA_FIELD_NAME}" en GHL` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ghl-mc-clients] failed:', msg)
    return json({ error: msg }, 502)
  }
})
