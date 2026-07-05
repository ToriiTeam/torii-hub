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

interface SendReportBody {
  to: string
  clientName: string
  monthLabel: string
  pdfBase64: string // raw base64, no "data:application/pdf;base64," prefix
}

// "From" address must belong to a domain verified in Resend. Defaults to
// the same @toriiteam.site domain already used for client emails
// (clients.email) — override with the RESEND_FROM_EMAIL secret if that
// domain isn't verified in the Resend account this key belongs to.
const DEFAULT_FROM = 'Torii Reportes <reportes@toriiteam.site>'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.error('[send-report-email] RESEND_API_KEY is not configured')
    return json({ error: 'RESEND_API_KEY no está configurada. Corré: supabase secrets set RESEND_API_KEY=...' }, 500)
  }

  let body: SendReportBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON' }, 400)
  }

  const { to, clientName, monthLabel, pdfBase64 } = body
  if (!to || !clientName || !monthLabel || !pdfBase64) {
    return json({ error: 'to, clientName, monthLabel and pdfBase64 are required' }, 400)
  }

  const from = Deno.env.get('RESEND_FROM_EMAIL') || DEFAULT_FROM
  const subject = `Informe mensual - ${clientName} - ${monthLabel}`
  const filename = `informe-${clientName}-${monthLabel}.pdf`.replace(/\s+/g, '-').toLowerCase()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: `
        <p>Hola,</p>
        <p>Adjuntamos el informe mensual de <strong>${clientName}</strong> correspondiente a <strong>${monthLabel}</strong>.</p>
        <p>Saludos,<br/>Equipo Torii</p>
      `,
      attachments: [{ filename, content: pdfBase64 }],
    }),
  })

  const resText = await res.text()
  if (!res.ok) {
    console.error('[send-report-email] Resend error:', res.status, resText)
    return json({ error: `Resend error: ${resText}` }, 502)
  }

  return json({ success: true, resend: JSON.parse(resText) })
})
