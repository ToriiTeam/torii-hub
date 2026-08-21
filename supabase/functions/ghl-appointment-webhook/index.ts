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

  const ghlContactId = contact.id ?? appointment.contactId ?? body.contactId ?? null
  const ghlAppointmentId = appointment.id ?? body.appointmentId ?? body.id ?? null
  const startTime = appointment.startTime ?? appointment.start_time ?? body.startTime ?? null
  const calendarId = appointment.calendarId ?? body.calendarId ?? null
  // Solo viene si quien armó el Workflow en GHL agregó "locationId":
  // "{{location.id}}" al JSON del Custom Webhook — no es automático.
  const locationId = body.locationId ?? appointment.locationId ?? null
  // Igual: solo viene si el Workflow "Appointment Status" (distinto al de
  // "Appointment Booked") agrega el merge field de status al JSON. Valores
  // esperados de la API de GHL: new/confirmed/cancelled/showed/noshow/
  // invalid — sin CHECK en DB todavía hasta confirmar 2-3 payloads reales.
  const status = appointment.status ?? appointment.appointmentStatus ?? body.status ?? null

  const adId = attribution.utm_content
    ?? body.customField?.ad_id
    ?? body.customData?.ad_id
    ?? null

  return {
    leadName,
    leadPhone: contact.phone ?? null,
    leadEmail: contact.email ?? null,
    ghlContactId: ghlContactId ? String(ghlContactId) : null,
    ghlAppointmentId: ghlAppointmentId ? String(ghlAppointmentId) : null,
    startTime,
    calendarId,
    locationId,
    status,
    adId,
    utmCampaign: attribution.utm_campaign ?? null,
    utmSource: attribution.utm_source ?? null,
  }
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Texto del mensaje de sistema que se inserta en chat_messages cuando una
// cita queda vinculada a un cliente. Formato calcado del mockup: "Cita
// agendada con Rodrigo Serna — jueves 14:00 hs." (día de semana en
// minúscula + hora, sin fecha numérica — ya es "formato legible" así).
// fecha/hora vienen de splitStartTime ("YYYY-MM-DD"/"HH:MM", en la hora
// local del calendario de GHL), así que el día de semana se calcula a mano
// con los componentes de la fecha en vez de pasar por `new Date(fecha)`
// (que interpretaría "YYYY-MM-DD" como medianoche UTC y podría correrse un
// día según el huso horario del runtime).
function buildChatMessage(leadName: string | null, fecha: string | null, hora: string | null): string {
  const nombre = leadName ?? 'un lead'
  const match = fecha?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return `Cita agendada con ${nombre}.`

  const [, y, m, d] = match
  const dow = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay()
  const diaSemana = DIAS_SEMANA[dow]
  const horaTexto = hora ? ` ${hora}` : ''

  return `Cita agendada con ${nombre} — ${diaSemana}${horaTexto} hs.`
}

interface OwnerMapping {
  clientId: string | null
  ownerType: 'torii' | 'client' | null
}

// Resuelve el dueño de la agenda contra clients (locationId primero,
// calendarId de fallback) en vez de un mapa hardcodeado — cargar un cliente
// nuevo a la automatización es completar su ficha, no un deploy. Torii no
// es una fila de clients, así que su locationId/calendarId son secrets de
// esta función (GHL_LOCATION_ID ya existía, lo usa también ghl-mc-clients;
// GHL_TORII_CALENDAR_ID es nuevo). Si no matchea nada, NO defaultea a
// Torii en silencio — devuelve ownerType null para que la fila se inserte
// igual marcada como "sin mapear" y un admin la asigne a mano.
async function resolveOwner(
  supabase: ReturnType<typeof createClient>,
  locationId: string | null,
  calendarId: string | null,
): Promise<OwnerMapping> {
  const toriiLocationId = Deno.env.get('GHL_LOCATION_ID')
  const toriiCalendarId = Deno.env.get('GHL_TORII_CALENDAR_ID')

  if ((locationId && locationId === toriiLocationId) || (calendarId && calendarId === toriiCalendarId)) {
    return { clientId: null, ownerType: 'torii' }
  }

  if (locationId) {
    const { data } = await supabase.from('clients').select('id').eq('ghl_location_id', locationId).maybeSingle()
    if (data) return { clientId: data.id as string, ownerType: 'client' }
  }

  if (calendarId) {
    const { data } = await supabase.from('clients').select('id').eq('ghl_calendar_id', calendarId).maybeSingle()
    if (data) return { clientId: data.id as string, ownerType: 'client' }
  }

  return { clientId: null, ownerType: null }
}

// Vincula la cita a un referido cuando el contacto de GHL matchea uno ya
// cargado en referidos.ghl_contact_id — scoped también por client_id para
// evitar falsos positivos cross-cliente. Hoy esto no matchea nunca:
// ghl_contact_id en referidos todavía no se puebla en ningún lado (eso es
// el Paso 5, sync con GHL, que no existe todavía), así que el
// comportamiento actual de la función no cambia hasta que exista ese dato.
// Nunca pisa el estado hacia atrás: si el referido ya está en 'cerrado' o
// 'no_califico', se deja como está.
async function matchReferido(
  supabase: ReturnType<typeof createClient>,
  ghlContactId: string | null,
  clientId: string | null,
): Promise<string | null> {
  if (!ghlContactId || !clientId) return null

  const { data: referido } = await supabase
    .from('referidos')
    .select('id, estado')
    .eq('ghl_contact_id', ghlContactId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!referido) return null

  if (['pendiente_datos', 'pendiente_contacto', 'contactado'].includes(referido.estado as string)) {
    const { error } = await supabase.from('referidos').update({ estado: 'en_proceso' }).eq('id', referido.id as string)
    if (error) {
      console.error('[ghl-appointment-webhook] failed to update referido estado:', error.message)
    }
  }

  return referido.id as string
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role bypasses RLS — required since GHL calls this endpoint
    // with no Supabase auth (--no-verify-jwt), and the table's only policy
    // grants access to the authenticated role.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const mapping = await resolveOwner(supabase, fields.locationId, fields.calendarId)
  if (mapping.ownerType === null) {
    console.error(
      `[ghl-appointment-webhook] no client matched locationId="${fields.locationId}" calendarId="${fields.calendarId}" — inserting unmapped (owner_type=null) for manual assignment.`,
    )
  }

  const { fecha, hora } = splitStartTime(fields.startTime)

  const referidoId = await matchReferido(supabase, fields.ghlContactId, mapping.clientId)

  // estado_cita/cancelada solo se incluyen en el upsert cuando el payload
  // trae un status real (lo manda el Workflow "Appointment Status", no el
  // de "Appointment Booked"). Si se omitieran siempre con NULL/false, un
  // re-disparo del Workflow de Booked sobre una fila ya cancelada la
  // "des-cancelaría" por accidente — al no incluir estas 2 columnas en el
  // objeto, el UPDATE del upsert no las toca en absoluto. Mismo criterio
  // para referido_id: solo se incluye cuando hay match real, así un
  // re-disparo sin ese match no lo "des-vincula" por accidente.
  const statusFields = fields.status !== null
    ? { estado_cita: fields.status, cancelada: fields.status === 'cancelled' }
    : {}
  const referidoFields = referidoId !== null ? { referido_id: referidoId } : {}

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
        ...statusFields,
        ...referidoFields,
      },
      { onConflict: 'ghl_appointment_id' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('[ghl-appointment-webhook] upsert failed:', error.message, '| fields:', fields)
    return json({ error: error.message }, 500)
  }

  // Mensaje de sistema en el chat del cliente — best-effort. Solo tiene
  // sentido si la cita quedó vinculada a un cliente real (mapping.clientId);
  // si vino sin mapear (owner_type null) no hay a qué client_id engancharlo,
  // así que se omite en silencio. Un fallo acá no debe tumbar la respuesta
  // 200 del webhook: el upsert de client_closer_calls ya es lo crítico.
  if (mapping.clientId) {
    try {
      const texto = buildChatMessage(fields.leadName, fecha, hora)
      const { error: chatError } = await supabase.from('chat_messages').insert({
        client_id: mapping.clientId,
        sender_type: 'system',
        sender_name: 'Automatización',
        texto,
        related_call_id: data.id,
      })
      if (chatError) {
        console.error('[ghl-appointment-webhook] chat_messages insert failed:', chatError.message)
      }
    } catch (err) {
      console.error('[ghl-appointment-webhook] chat_messages insert threw:', err)
    }
  }

  return json({ success: true, id: data.id, unmapped: mapping.ownerType === null, referidoId })
})
