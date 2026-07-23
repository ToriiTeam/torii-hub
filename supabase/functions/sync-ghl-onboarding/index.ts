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

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

function ghlHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    'Content-Type': 'application/json',
  }
}

// Pre-call/booking fields that happen to live in the same GHL location and
// get populated for every contact who books a call — not onboarding
// answers (confirmed against real data: they showed up populated for
// Adolfo Blasco, who hadn't completed onboarding, and for Raúl Galindo,
// who had — so they're not a reliable onboarding signal either way and
// would just be noise in the Onboarding tab).
//
// Excluded by GHL custom field ID, not question text — this location has
// near-duplicate fields with slightly different wording for the same
// underlying question (confirmed: "Te CONTACTAREMOS..." exists in 2
// variants with different punctuation, "Con quien del equipo..." exists
// with and without "de Torii"). An exact-text match silently let one
// variant through in testing; IDs are stable and unambiguous.
const EXCLUDED_FIELD_IDS = new Set([
  'NTBT5zd0IYDS7EmQdxqD', // Te CONTACTAREMOS por Whatsapp... (variant 1)
  'P7qp67dphYnRRyu0xOxy', // Si, 100% asistiré + Te CONTACTAREMOS... (variant 2)
  'kW1ON33kvReyYdACYqsE', // Con quien del equipo de Torii estuviste en contacto?
  'z1nI6e7oModNVg2OsKK7', // Con quien del equipo estuviste en contacto? (variant without "de Torii")
])

interface GhlCustomField { id: string; name: string }
interface GhlContactCustomFieldValue { id: string; value?: unknown }
interface GhlContact {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  customFields?: GhlContactCustomFieldValue[]
}

async function searchContact(apiKey: string, locationId: string, field: 'email' | 'phone', value: string): Promise<GhlContact | null> {
  const res = await fetch(`${GHL_BASE}/contacts/search`, {
    method: 'POST',
    headers: ghlHeaders(apiKey),
    body: JSON.stringify({
      locationId,
      page: 1,
      pageLimit: 1,
      filters: [{ field, operator: 'eq', value }],
    }),
  })
  if (!res.ok) throw new Error(`GHL contacts/search failed: ${res.status} ${await res.text()}`)
  const body = await res.json()
  const contacts: GhlContact[] = body.contacts ?? []
  return contacts[0] ?? null
}

async function fetchCustomFieldDefs(apiKey: string, locationId: string): Promise<GhlCustomField[]> {
  const res = await fetch(`${GHL_BASE}/locations/${locationId}/customFields`, { headers: ghlHeaders(apiKey) })
  if (!res.ok) throw new Error(`GHL customFields failed: ${res.status} ${await res.text()}`)
  const body = await res.json()
  return body.customFields ?? []
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('GHL_API_KEY')
  const locationId = Deno.env.get('GHL_LOCATION_ID')
  if (!apiKey || !locationId) {
    return json({ error: 'GHL_API_KEY y/o GHL_LOCATION_ID no configuradas' }, 500)
  }

  let body: { client_id?: string; ghl_email?: string; ghl_phone?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }
  if (!body.client_id) return json({ error: 'client_id is required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, email, phone')
    .eq('id', body.client_id)
    .single()
  if (clientErr || !client) return json({ error: 'Cliente no encontrado' }, 404)

  // Explicit override (ghl_email/ghl_phone) wins — clients.email/phone in
  // the Hub is sometimes a placeholder or missing entirely and doesn't
  // match the contact's real GHL record (confirmed case: Raúl Galindo's
  // clients.email is a @toriiteam.site placeholder, not the gmail address
  // his real GHL contact uses).
  const email = body.ghl_email || client.email
  const phone = body.ghl_phone || client.phone

  let contact: GhlContact | null = null
  try {
    if (email) contact = await searchContact(apiKey, locationId, 'email', email)
    if (!contact && phone) contact = await searchContact(apiKey, locationId, 'phone', phone)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: msg }, 502)
  }

  if (!contact) {
    return json({
      success: false,
      message: 'No se encontró un contacto en GHL con ese email/teléfono. Probá pasando ghl_email o ghl_phone explícitamente.',
    })
  }

  const fieldDefs = await fetchCustomFieldDefs(apiKey, locationId)
  const nameById = new Map(fieldDefs.map((f) => [f.id, f.name]))

  // orden = sync-time order, i.e. the position in GHL's own
  // contact.customFields array after filtering — NOT the real
  // questionnaire sequence (GHL doesn't expose that reliably: `position`
  // ties heavily across questions, `dateAdded` reflects bulk-import
  // batches, not form layout — confirmed by inspecting real data). Just
  // consistent per client across re-syncs, until a manual per-question
  // order mapping overwrites it.
  const populated = (contact.customFields ?? [])
    .filter((cf) => cf.value !== undefined && cf.value !== null && cf.value !== '')
    .filter((cf) => !EXCLUDED_FIELD_IDS.has(cf.id))
    .map((cf, idx) => ({ campo: nameById.get(cf.id) ?? cf.id, valor: String(cf.value), orden: idx }))

  if (populated.length === 0) {
    return json({
      success: true,
      contactId: contact.id,
      syncedCount: 0,
      message: 'Este cliente no completó el formulario de onboarding todavía.',
    })
  }

  const now = new Date().toISOString()
  const rows = populated.map((f) => ({
    client_id: body.client_id,
    fuente: 'GHL',
    campo: f.campo,
    valor: f.valor,
    orden: f.orden,
    synced_at: now,
  }))

  const { error: upsertErr } = await supabase
    .from('client_onboarding_responses')
    .upsert(rows, { onConflict: 'client_id,fuente,campo' })
  if (upsertErr) return json({ error: upsertErr.message }, 500)

  return json({ success: true, contactId: contact.id, syncedCount: rows.length })
})
