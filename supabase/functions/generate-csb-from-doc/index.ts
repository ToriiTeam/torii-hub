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

interface RequestBody {
  text: string
}

const SYSTEM_PROMPT = `Sos un estratega senior en una agencia de Meta Ads especializada en asesores financieros de LATAM y España. Te pasan el texto plano de un documento (brief, propuesta, notas de onboarding) sobre un cliente, y tenés que extraer la información relevante para armar su Client Strategy Brief (CSB). Solo extraés información que esté explícita o razonablemente inferible del texto — si un campo no aparece en el documento, dejalo vacío (string vacío o null) en vez de inventar contenido.`

function buildUserMessage(text: string): string {
  return `Extraé los campos del CSB a partir del siguiente documento. Usá la herramienta extraer_csb.

DOCUMENTO
"""
${text}
"""

Instrucciones por campo:
- oferta: descripción del servicio/producto que ofrece el cliente a sus propios clientes.
- icp: perfil del cliente ideal del cliente (Ideal Customer Profile).
- mercado: mercado objetivo (ej. "Asesores financieros España").
- angulo_principal: ángulo narrativo principal que deberían usar los ads.
- hipotesis_activa: hipótesis que se está testeando actualmente, si el documento la menciona.
- objecion_principal: la objeción más frecuente del mercado objetivo.
- propuesta_de_valor: qué hace diferente a este cliente de sus competidores.
- precio: precio del servicio/producto, como número (sin símbolo de moneda). Si el documento menciona un rango, usá el valor más representativo.
- garantia: garantía ofrecida, si el documento la menciona.

Si el documento no tiene información suficiente para un campo, devolvé un string vacío para textos, o null para precio — nunca inventes contenido.`
}

const CSB_TOOL = {
  name: 'extraer_csb',
  description: 'Extrae los campos del Client Strategy Brief a partir del texto de un documento.',
  input_schema: {
    type: 'object',
    properties: {
      oferta: { type: 'string' },
      icp: { type: 'string' },
      mercado: { type: 'string' },
      angulo_principal: { type: 'string' },
      hipotesis_activa: { type: 'string' },
      objecion_principal: { type: 'string' },
      propuesta_de_valor: { type: 'string' },
      precio: { type: ['number', 'null'] },
      garantia: { type: 'string' },
    },
    required: [
      'oferta', 'icp', 'mercado', 'angulo_principal', 'hipotesis_activa',
      'objecion_principal', 'propuesta_de_valor', 'precio', 'garantia',
    ],
  },
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('[generate-csb-from-doc] ANTHROPIC_API_KEY is not configured')
    return json({ error: 'ANTHROPIC_API_KEY no está configurada. Corré: supabase secrets set ANTHROPIC_API_KEY=...' }, 500)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }

  if (!body.text || !body.text.trim()) {
    return json({ error: 'text is required' }, 400)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(body.text) }],
      tools: [CSB_TOOL],
      tool_choice: { type: 'tool', name: 'extraer_csb' },
    }),
  })

  const resText = await res.text()
  if (!res.ok) {
    console.error('[generate-csb-from-doc] Anthropic error:', res.status, resText)
    return json({ error: `Anthropic error: ${resText}` }, 502)
  }

  const data = JSON.parse(resText)
  const toolUse = (data.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
  if (!toolUse) {
    console.error('[generate-csb-from-doc] no tool_use block in response:', resText)
    return json({ error: 'Claude no devolvió los campos esperados' }, 502)
  }

  return json({ data: toolUse.input })
})
