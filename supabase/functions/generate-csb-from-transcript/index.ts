// 2-step (+1 short) Claude pipeline: Paso 1 extracts structured evidence
// from a sales-call transcript into the 7-block CSB schema (tool-use,
// forced, same pattern as generate-csb-from-doc). Paso 2 takes that JSON
// and writes the narrative Client Strategic Brief (plain Markdown, no
// tool-use — it's prose meant to be pasted into Word). Paso 3 is a short
// extra call (not part of the original spec's 2 prompts) that pulls the 3
// "Criterio de ejecución" fields out of Paso 2's Markdown via tool-use —
// far more reliable than parsing Markdown by hand for 3 short fields.
//
// None of these calls touch the database — same contract as
// generate-csb-from-doc: this function only returns JSON, and TabCSB.tsx
// populates the edit form. Benjamin reviews and saves explicitly.
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
  client_id: string
  transcripcion: string
}

// ─── Paso 1: extracción forense ─────────────────────────────────────────────
// Prompt exacto validado por Benjamin — no reescribir.
const EXTRACTION_SYSTEM_PROMPT = `Actúa como analista estratégico de Torii Agency, una agencia de crecimiento para asesores financieros.

Tu tarea es extraer información estructurada de esta transcripción de llamada de ventas.

Reglas:
- Solo usás información explícita o claramente implícita en la transcripción
- Si un campo no tiene evidencia, escribís: SIN DATO
- Para campos inferidos, incluís entre corchetes la frase exacta usada como evidencia
- No inventás. No agregás conocimiento general.
- Respondés únicamente con el JSON, sin texto adicional`

function buildExtractionUserMessage(transcripcion: string): string {
  return `Transcripción:
"""
${transcripcion}
"""

Completá este JSON:
{
"cliente": {
"nombre_completo": "",
"pais": "",
"empresa_o_marca": "",
"red_o_aseguradora": ""
},
"identidad_estrategica": {
"arquetipo_operativo": "",
"mercado_real_atiende": "",
"palanca_historica_crecimiento": "",
"nivel_autoridad_mercado": "1|2|3",
"evidencia_nivel_autoridad": ""
},
"estado_actual": {
"reuniones_por_semana": "",
"tasa_cierre_estimada": "",
"ticket_promedio": "",
"canal_adquisicion_actual": "",
"tiene_equipo": "",
"tiene_crm": "",
"capacidad_operativa": ""
},
"estado_deseado": {
"objetivo_declarado": "",
"objetivo_real_inferido": "",
"evidencia_objetivo_inferido": "",
"definicion_exito_90_dias": "",
"evidencia_definicion_exito": ""
},
"constraints": {
"mercado": "",
"mentalidad": "",
"infraestructura": "",
"capacidad": ""
},
"riesgos": [
{ "tipo": "", "descripcion": "", "severidad": "alta|media|baja" }
],
"inteligencia": {
"detonante_compra": "",
"evidencia_detonante": "",
"frases_exactas_cliente": [],
"oportunidades_identificadas": ""
}
}`
}

const EXTRACTION_TOOL = {
  name: 'extraer_csb',
  description: 'Extrae los 7 bloques del Client Strategy Brief a partir de la transcripción de una llamada de ventas.',
  input_schema: {
    type: 'object',
    properties: {
      cliente: {
        type: 'object',
        properties: {
          nombre_completo: { type: 'string' }, pais: { type: 'string' },
          empresa_o_marca: { type: 'string' }, red_o_aseguradora: { type: 'string' },
        },
        required: ['nombre_completo', 'pais', 'empresa_o_marca', 'red_o_aseguradora'],
      },
      identidad_estrategica: {
        type: 'object',
        properties: {
          arquetipo_operativo: { type: 'string' }, mercado_real_atiende: { type: 'string' },
          palanca_historica_crecimiento: { type: 'string' }, nivel_autoridad_mercado: { type: 'string' },
          evidencia_nivel_autoridad: { type: 'string' },
        },
        required: ['arquetipo_operativo', 'mercado_real_atiende', 'palanca_historica_crecimiento', 'nivel_autoridad_mercado', 'evidencia_nivel_autoridad'],
      },
      estado_actual: {
        type: 'object',
        properties: {
          reuniones_por_semana: { type: 'string' }, tasa_cierre_estimada: { type: 'string' },
          ticket_promedio: { type: 'string' }, canal_adquisicion_actual: { type: 'string' },
          tiene_equipo: { type: 'string' }, tiene_crm: { type: 'string' }, capacidad_operativa: { type: 'string' },
        },
        required: ['reuniones_por_semana', 'tasa_cierre_estimada', 'ticket_promedio', 'canal_adquisicion_actual', 'tiene_equipo', 'tiene_crm', 'capacidad_operativa'],
      },
      estado_deseado: {
        type: 'object',
        properties: {
          objetivo_declarado: { type: 'string' }, objetivo_real_inferido: { type: 'string' },
          evidencia_objetivo_inferido: { type: 'string' }, definicion_exito_90_dias: { type: 'string' },
          evidencia_definicion_exito: { type: 'string' },
        },
        required: ['objetivo_declarado', 'objetivo_real_inferido', 'evidencia_objetivo_inferido', 'definicion_exito_90_dias', 'evidencia_definicion_exito'],
      },
      constraints: {
        type: 'object',
        properties: {
          mercado: { type: 'string' }, mentalidad: { type: 'string' },
          infraestructura: { type: 'string' }, capacidad: { type: 'string' },
        },
        required: ['mercado', 'mentalidad', 'infraestructura', 'capacidad'],
      },
      riesgos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string' }, descripcion: { type: 'string' },
            severidad: { type: 'string', enum: ['alta', 'media', 'baja'] },
          },
          required: ['tipo', 'descripcion', 'severidad'],
        },
      },
      inteligencia: {
        type: 'object',
        properties: {
          detonante_compra: { type: 'string' }, evidencia_detonante: { type: 'string' },
          frases_exactas_cliente: { type: 'array', items: { type: 'string' } },
          oportunidades_identificadas: { type: 'string' },
        },
        required: ['detonante_compra', 'evidencia_detonante', 'frases_exactas_cliente', 'oportunidades_identificadas'],
      },
    },
    required: ['cliente', 'identidad_estrategica', 'estado_actual', 'estado_deseado', 'constraints', 'riesgos', 'inteligencia'],
  },
}

// ─── Paso 2: síntesis editorial (brief narrativo, Markdown) ────────────────
// Prompt exacto validado por Benjamin — no reescribir. Adaptado solo en la
// forma de entrega de los datos del Paso 1 (acá van como bloque de texto en
// el mensaje de usuario, ya que esta llamada es independiente de la del
// Paso 1, no una continuación de la misma conversación).
const BRIEF_SYSTEM_PROMPT = `Actuá como estratega senior de Torii Agency y generá el Client Strategic Brief completo usando los datos que acabás de extraer.

Contexto de Torii:
- Trabajamos exclusivamente con agentes de seguros
- Nosotros cubrimos: oferta, posicionamiento, ICP, Meta Ads, creativos, seguimientos y adquisición
- El cliente es responsable de: ventas
- El mayor riesgo en una cuenta no es la adquisición — es la implementación del lado del cliente

Instrucciones:
- Sé conciso y directo, sin relleno
- Usá el lenguaje del cliente cuando sea posible
- Si un campo llegó como SIN DATO, mantenlo visible
- En la síntesis final, tomá una posición clara: no describas, decidí
- Marcá la síntesis con [REQUIERE VALIDACIÓN]

Formato del brief:
# Client Strategic Brief — [nombre del cliente]
Fecha: [hoy] | Cuenta activa desde: [fecha de inicio si está disponible]
---
## 1. Identidad estratégica
[arquetipo, mercado real, palanca histórica, nivel de autoridad]
## 2. Estado actual
[números de producción, canal de adquisición, capacidad operativa]
## 3. Estado deseado y brecha
[objetivo declarado vs. inferido, definición de éxito en 90 días, tamaño de la brecha]
## 4. Constraints y riesgos
[los 4 constraints + riesgos con severidad]
## 5. Inteligencia estratégica
[detonante de compra, frases exactas del cliente entre comillas, oportunidades]
---
## Criterio de ejecución [REQUIERE VALIDACIÓN]
- Mayor apalancamiento:
- Mayor riesgo:
- Señal de éxito en 30 días:

Formateá el output usando estilos de Word: usa # para Título 1, ## para Título 2, **negrita** para etiquetas de campo, y guiones para listas. El documento tiene que poder pegarse en Word y quedar legible sin ajustes.

Este documento es para uso exclusivo del equipo de delivery. El cliente ya cerró. No analices probabilidad de cierre, objeciones de venta ni señales de compra. Enfocate únicamente en: - Quién es el cliente y dónde está - A dónde quiere llegar - Qué puede impedir que los resultados lleguen - Qué compromisos o expectativas quedaron en la llamada que delivery necesita conocer desde el día 1`

function buildBriefUserMessage(extractedJson: unknown): string {
  return `Datos extraídos en el paso anterior:
\`\`\`json
${JSON.stringify(extractedJson, null, 2)}
\`\`\`

Generá el Client Strategic Brief completo a partir de estos datos, siguiendo el formato indicado.`
}

// ─── Paso 3: extracción de los 3 campos de síntesis (no es parte del ───────
// spec original — decisión tomada en vez de parsear el Markdown a mano,
// que sería frágil ante variaciones mínimas de formato del modelo).
// Anthropic's tool input_schema property keys must match
// ^[a-zA-Z0-9_.-]{1,64}$ — "señal_exito_30_dias" (the DB/frontend field
// name, ñ included) is rejected outright, confirmed via a live smoke test
// (400 invalid_request_error). Using an ASCII-safe key here and renaming
// it back to the real field name afterward, in code, not in the schema.
const SYNTHESIS_EXTRACTION_TOOL = {
  name: 'extraer_sintesis',
  description: 'Extrae los 3 campos de la sección "Criterio de ejecución" de un Client Strategic Brief.',
  input_schema: {
    type: 'object',
    properties: {
      mayor_apalancamiento: { type: 'string' },
      mayor_riesgo: { type: 'string' },
      senal_exito_30_dias: { type: 'string' },
    },
    required: ['mayor_apalancamiento', 'mayor_riesgo', 'senal_exito_30_dias'],
  },
}

interface AnthropicResult {
  ok: true
  content: Array<{ type: string; text?: string; input?: unknown }>
}
interface AnthropicError {
  ok: false
  status: number
  message: string
}

async function callClaude(apiKey: string, opts: {
  system: string
  userMessage: string
  tool?: Record<string, unknown>
  maxTokens: number
}): Promise<AnthropicResult | AnthropicError> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.userMessage }],
      ...(opts.tool ? { tools: [opts.tool], tool_choice: { type: 'tool', name: opts.tool.name } } : {}),
    }),
  })
  const resText = await res.text()
  if (!res.ok) return { ok: false, status: res.status, message: resText }
  const data = JSON.parse(resText)
  return { ok: true, content: data.content ?? [] }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY no está configurada. Corré: supabase secrets set ANTHROPIC_API_KEY=...' }, 500)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }
  if (!body.client_id) return json({ error: 'client_id is required' }, 400)
  if (!body.transcripcion || !body.transcripcion.trim()) return json({ error: 'transcripcion is required' }, 400)

  // ── Paso 1: extracción ────────────────────────────────────────────────
  const step1 = await callClaude(apiKey, {
    system: EXTRACTION_SYSTEM_PROMPT,
    userMessage: buildExtractionUserMessage(body.transcripcion),
    tool: EXTRACTION_TOOL,
    maxTokens: 4096,
  })
  if (!step1.ok) {
    return json({ success: false, stage: 'extraction', error: `Anthropic error: ${step1.message}` }, 502)
  }
  const extractToolUse = step1.content.find((c) => c.type === 'tool_use')
  if (!extractToolUse) {
    return json({ success: false, stage: 'extraction_parse', error: 'Claude no devolvió el JSON esperado en el Paso 1' }, 502)
  }
  const extracted = extractToolUse.input

  // ── Paso 2: brief narrativo ────────────────────────────────────────────
  const step2 = await callClaude(apiKey, {
    system: BRIEF_SYSTEM_PROMPT,
    userMessage: buildBriefUserMessage(extracted),
    maxTokens: 4096,
  })
  if (!step2.ok) {
    // Paso 1 sí funcionó — devolvemos esos datos igual en vez de descartarlos.
    return json({
      success: true,
      data: { ...(extracted as object), brief_document: null, sintesis: {} },
      warning: `La generación del brief narrativo falló (Anthropic error: ${step2.message}). Los datos extraídos de la transcripción sí se completaron — revisalos y guardalos, o reintentá la generación del brief más tarde.`,
    })
  }
  const briefTextBlock = step2.content.find((c) => c.type === 'text')
  const briefDocument = briefTextBlock?.text ?? null
  if (!briefDocument) {
    return json({
      success: true,
      data: { ...(extracted as object), brief_document: null, sintesis: {} },
      warning: 'Claude no devolvió texto en el Paso 2. Los datos extraídos de la transcripción sí se completaron.',
    })
  }

  // ── Paso 3: extracción de los 3 campos de síntesis ─────────────────────
  const step3 = await callClaude(apiKey, {
    system: 'Extraé los 3 campos de la sección "Criterio de ejecución" del siguiente brief. Devolvé el texto de cada punto tal como aparece, sin la etiqueta ni el prefijo "-".',
    userMessage: briefDocument,
    tool: SYNTHESIS_EXTRACTION_TOOL,
    maxTokens: 1024,
  })
  if (!step3.ok) {
    return json({
      success: true,
      data: { ...(extracted as object), brief_document: briefDocument, sintesis: {} },
      warning: `El brief se generó pero no se pudieron extraer automáticamente los 3 campos de síntesis (Anthropic error: ${step3.message}). Copialos manualmente de la sección "Criterio de ejecución" del documento.`,
    })
  }
  const synthesisToolUse = step3.content.find((c) => c.type === 'tool_use')
  const synthesisInput = synthesisToolUse?.input as { mayor_apalancamiento?: string; mayor_riesgo?: string; senal_exito_30_dias?: string } | undefined
  const sintesis = synthesisInput
    ? {
        mayor_apalancamiento: synthesisInput.mayor_apalancamiento ?? '',
        mayor_riesgo: synthesisInput.mayor_riesgo ?? '',
        señal_exito_30_dias: synthesisInput.senal_exito_30_dias ?? '',
      }
    : {}
  if (!synthesisToolUse) {
    return json({
      success: true,
      data: { ...(extracted as object), brief_document: briefDocument, sintesis: {} },
      warning: 'El brief se generó pero no se pudieron extraer automáticamente los 3 campos de síntesis. Copialos manualmente de la sección "Criterio de ejecución" del documento.',
    })
  }

  return json({
    success: true,
    data: { ...(extracted as object), brief_document: briefDocument, sintesis },
  })
})
