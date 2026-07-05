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

interface NarrativeMetrics {
  inversionTotal: number
  leads: number
  cpl: number | null
  reuniones: number
  cpbc: number | null
  showRate: number | null
  cierres: number
  cac: number | null
}

interface RequestBody {
  clientName: string
  country: string | null
  nicho: string | null
  periodLabel: string
  metrics: NarrativeMetrics
}

// The 5 fixed bottleneck categories (agency-wide funnel stages) — Claude
// must pick exactly one of these, verbatim, for `cuello_de_botella`.
const BOTTLENECK_OPTIONS = [
  'Tráfico / generación de leads',
  'Calificación de leads',
  'Show rate (asistencia)',
  'Cierre / conversión en la llamada',
  'Oferta o pricing',
]

const SYSTEM_PROMPT = `Sos un estratega senior en una agencia de Meta Ads especializada en asesores financieros de LATAM y España. Analizás los resultados de campañas de un período y generás el borrador narrativo de un informe de performance para el cliente. Escribís en español neutro, tono profesional pero cercano, directo y sin relleno. Basás cada afirmación en los números reales que te dan — nunca inventás cifras ni resultados que no te fueron provistos. Si un dato es cero o no está disponible, lo decís explícitamente en vez de fabricar un análisis sobre él.`

function fmtMetric(v: number | null, suffix = ''): string {
  return v == null ? 'sin datos' : `${v.toLocaleString('es-MX', { maximumFractionDigits: 2 })}${suffix}`
}

function buildUserMessage(body: RequestBody): string {
  const m = body.metrics
  return `Generá el borrador narrativo del informe de ${body.clientName} para el período ${body.periodLabel}.

DATOS DEL CLIENTE
- País: ${body.country ?? 'no especificado'}
- Nicho: ${body.nicho ?? 'no especificado'}

MÉTRICAS DEL PERÍODO
- Inversión total: $${fmtMetric(m.inversionTotal)}
- Leads generados: ${m.leads}
- CPL (costo por lead): ${fmtMetric(m.cpl)}
- Reuniones agendadas: ${m.reuniones}
- CPBC (costo por reunión agendada): ${fmtMetric(m.cpbc)}
- Show rate (asistencia a la llamada): ${fmtMetric(m.showRate, '%')}
- Cierres: ${m.cierres}
- CAC (costo por cliente cerrado): ${fmtMetric(m.cac)}

Generá el borrador usando la herramienta generar_borrador_informe. Instrucciones por campo:

- resumen_ejecutivo: 3-4 líneas, qué se hizo en el período y qué resultados concretos se obtuvieron, citando los números de arriba.
- aprendizajes_funcionaron: qué funcionó mejor (mensajes, ángulos, segmentación), inferido de las métricas — ej. si el CPL es bueno pero el show rate es bajo, el problema no está en la generación de leads.
- aprendizajes_descartado: qué no funcionó o qué hipótesis se descartó este período.
- hipotesis_validadas: qué se confirmó con los datos de este período.
- hipotesis_pendientes: qué falta probar todavía.
- cuello_de_botella: elegí EXACTAMENTE una de estas 5 opciones tal cual (sin parafrasear), la que corresponda a la métrica más débil del funnel relativa a las demás: ${BOTTLENECK_OPTIONS.map((o) => `"${o}"`).join(', ')}. Justificá en una frase por qué esa y no otra.
- proximos_pasos: exactamente 3 acciones concretas para el próximo período, una por línea.
- necesitamos_del_cliente: qué necesita Torii de parte del cliente para ejecutar esos próximos pasos. Si no hay nada específico, decilo en vez de inventar algo.
- aumentara_exito: qué cambio concreto aumentaría las probabilidades de mejorar los resultados el próximo período.
- expectativas: qué expectativa realista debería tener el cliente para el próximo período según la tendencia actual — ni sobre-prometer ni ser alarmista.`
}

const NARRATIVE_TOOL = {
  name: 'generar_borrador_informe',
  description: 'Genera el borrador narrativo de un informe mensual de performance para un cliente de la agencia.',
  input_schema: {
    type: 'object',
    properties: {
      resumen_ejecutivo: { type: 'string' },
      aprendizajes_funcionaron: { type: 'string' },
      aprendizajes_descartado: { type: 'string' },
      hipotesis_validadas: { type: 'string' },
      hipotesis_pendientes: { type: 'string' },
      cuello_de_botella: { type: 'string', enum: BOTTLENECK_OPTIONS },
      proximos_pasos: { type: 'string' },
      necesitamos_del_cliente: { type: 'string' },
      aumentara_exito: { type: 'string' },
      expectativas: { type: 'string' },
    },
    required: [
      'resumen_ejecutivo', 'aprendizajes_funcionaron', 'aprendizajes_descartado',
      'hipotesis_validadas', 'hipotesis_pendientes', 'cuello_de_botella',
      'proximos_pasos', 'necesitamos_del_cliente', 'aumentara_exito', 'expectativas',
    ],
  },
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('[generate-report-narrative] ANTHROPIC_API_KEY is not configured')
    return json({ error: 'ANTHROPIC_API_KEY no está configurada. Corré: supabase secrets set ANTHROPIC_API_KEY=...' }, 500)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }

  if (!body.clientName || !body.periodLabel || !body.metrics) {
    return json({ error: 'clientName, periodLabel and metrics are required' }, 400)
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
      messages: [{ role: 'user', content: buildUserMessage(body) }],
      tools: [NARRATIVE_TOOL],
      tool_choice: { type: 'tool', name: 'generar_borrador_informe' },
    }),
  })

  const resText = await res.text()
  if (!res.ok) {
    console.error('[generate-report-narrative] Anthropic error:', res.status, resText)
    return json({ error: `Anthropic error: ${resText}` }, 502)
  }

  const data = JSON.parse(resText)
  const toolUse = (data.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
  if (!toolUse) {
    console.error('[generate-report-narrative] no tool_use block in response:', resText)
    return json({ error: 'Claude no devolvió el borrador esperado' }, 502)
  }

  return json({ data: toolUse.input })
})
