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

// Maps a GHL calendarId to the client this booking belongs to. Extracted
// from the booking widget URLs (.../widget/booking/{calendarId}):
//   Torii:          https://api.leadconnectorhq.com/widget/booking/nWH3iMURelrwQtakWcYe
//   Adolfo Blasco:  https://api.leadconnectorhq.com/widget/booking/BQHvGXV2U538u0eRbcvb
//   Raul Galindo:   https://api.leadconnectorhq.com/widget/booking/4lTNJ8XbAf0lrGQs7A3l
const CALENDAR_CLIENT_MAP: Record<string, { clientId: string | null; ownerType: string }> = {
  'nWH3iMURelrwQtakWcYe': { clientId: null, ownerType: 'torii' },
  'BQHvGXV2U538u0eRbcvb': { clientId: 'c71488f4-0f94-4850-9a96-bc97fbaf5171', ownerType: 'client' },
  '4lTNJ8XbAf0lrGQs7A3l': { clientId: 'fcc225d1-555a-4d9c-abb9-b823d48b6516', ownerType: 'client' },
}

// GHL sends startTime as an ISO string with an explicit offset (the
// calendar's local time), e.g. "2026-07-10T14:30:00-05:00". Slicing the
// string directly (instead of going through Date + toISOString) keeps that
// local wall-clock time instead of shifting it to UTC.
function splitStartTime(startTime: string | undefined | null): { fecha: string | null; hora: string | null } {
  if (!startTime) return { fecha: null, hora: null }
  const match = startTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (match) return { fecha: match[1], hora: match[2] }
  const d = new Date(startTime)
  if (isNaN(d.getTime())) return { fecha: null, hora: null }
  return { fecha: d.toISOString().slice(0, 10), hora: d.toISOString().slice(11, 16) }
}

// deno-lint-ignore no-explicit-any
type GhlPayload = Record<string, any>

// GHL's exact webhook shape varies by trigger/version, so this reads a few
// plausible paths for each field rather than assuming one fixed structure.
// If real payloads turn out to differ, adjust these lookups — the rest of
// the function (mapping + upsert) doesn't need to change.
function extractFields(body: GhlPayload) {
  const contact = body.contact ?? {}
  const appointment = body.appointment ?? body
  const attribution = body.attributionSource ?? contact.attributionSource ?? appointment.attributionSource ?? {}

  const firstName = contact.firstName ?? contact.first_name ?? ''
  const lastName = contact.lastName ?? contact.last_name ?? ''
  const leadName = [firstName, lastName].filter(Boolean).join(' ') || contact.name || null

  const ghlAppointmentId = appointment.id ?? body.appointmentId ?? body.id ?? null
  const startTime = appointment.startTime ?? appointment.start_time ?? body.startTime ?? null
  const calendarId = appointment.calendarId ?? body.calendarId ?? null

  const adId = attribution.utm_content
    ?? body.customField?.ad_id
    ?? body.customData?.ad_id
    ?? null

  return {
    leadName,
    leadPhone: contact.phone ?? null,
    leadEmail: contact.email ?? null,
    ghlAppointmentId: ghlAppointmentId ? String(ghlAppointmentId) : null,
    startTime,
    calendarId,
    adId,
    utmCampaign: attribution.utm_campaign ?? null,
    utmSource: attribution.utm_source ?? null,
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: GhlPayload
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }

  const fields = extractFields(body)

  if (!fields.ghlAppointmentId) {
    console.error('[ghl-appointment-webhook] missing appointment id — raw body:', JSON.stringify(body))
    return json({ error: 'appointment.id is required' }, 400)
  }

  let mapping = fields.calendarId ? CALENDAR_CLIENT_MAP[fields.calendarId] : undefined
  if (!mapping) {
    console.error(`[ghl-appointment-webhook] unknown calendarId "${fields.calendarId}" — defaulting to Torii. Add it to CALENDAR_CLIENT_MAP.`)
    mapping = { clientId: null, ownerType: 'torii' }
  }

  const { fecha, hora } = splitStartTime(fields.startTime)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role bypasses RLS — required since GHL calls this endpoint
    // with no Supabase auth (--no-verify-jwt), and the table's only policy
    // grants access to the authenticated role.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('client_closer_calls')
    .upsert(
      {
        client_id: mapping.clientId,
        owner_type: mapping.ownerType,
        lead_name: fields.leadName,
        lead_phone: fields.leadPhone,
        lead_email: fields.leadEmail,
        fecha_llamada: fecha,
        hora_llamada: hora,
        ghl_appointment_id: fields.ghlAppointmentId,
        fuente: fields.utmSource,
        ad_id: fields.adId,
        utm_campaign: fields.utmCampaign,
        utm_source: fields.utmSource,
      },
      { onConflict: 'ghl_appointment_id' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('[ghl-appointment-webhook] upsert failed:', error.message, '| fields:', fields)
    return json({ error: error.message }, 500)
  }

  return json({ success: true, id: data.id })
})
