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

// Fail-closed: unlike meta-ads-proxy's auditor check (fail-open, a narrow
// read-only scope), this creates a real Supabase Auth account and links it
// to a client's billing/journey data — any ambiguity (missing JWT, lookup
// error) denies the request rather than allowing it.
async function callerIsStaffAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return false

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .maybeSingle()

    return !error && !!data
  } catch {
    return false
  }
}

// Fixed shared password for every Portal client account — deliberate,
// not a placeholder. See conversation history: confirmed against the
// security tradeoff (one shared secret across all client accounts, no
// forced rotation) before shipping.
const PORTAL_PASSWORD = '234567'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!(await callerIsStaffAdmin(req))) {
    return json({ error: 'No autorizado' }, 403)
  }

  let body: { clientId?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }
  if (!body.clientId) return json({ error: 'clientId is required' }, 400)
  if (!body.email) return json({ error: 'email is required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, profile_id')
    .eq('id', body.clientId)
    .single()
  if (clientErr || !client) return json({ error: 'Cliente no encontrado' }, 404)
  if (client.profile_id) return json({ error: 'Este cliente ya tiene acceso al Portal creado' }, 400)

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: body.email,
    password: PORTAL_PASSWORD,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    const msg = createErr?.message ?? 'Error al crear el usuario'
    return json({ error: `No se pudo crear el usuario de Auth: ${msg}` }, 400)
  }

  // profiles no se crea sola — no hay trigger en auth.users que la genere
  // (confirmado al diagnosticar el caso de Víctor Othon: el createUser de
  // arriba había funcionado en un intento previo, pero como este paso no
  // existía, clients.profile_id nunca se pudo setear — la FK
  // clients_profile_id_fkey exige que la fila de profiles exista primero).
  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({ id: created.user.id, email: body.email, role: 'client' })
  if (profileErr) {
    return json({ error: `Usuario de Auth creado pero no se pudo crear su perfil: ${profileErr.message}` }, 500)
  }

  const { error: updateErr } = await supabase
    .from('clients')
    .update({ profile_id: created.user.id })
    .eq('id', body.clientId)
  if (updateErr) {
    return json({ error: `Usuario creado pero no se pudo vincular al cliente: ${updateErr.message}` }, 500)
  }

  return json({ success: true })
})
