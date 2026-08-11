// Función de prueba, aislada — NO conectada a ningún flujo real. Objetivo
// único: confirmar si @react-pdf/renderer levanta dentro del runtime Deno
// de Supabase Edge Functions (sin navegador headless), como paso previo a
// decidir si reemplaza html2canvas en generatePdf.ts.
import React from 'npm:react@18.3.1'
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
  Svg, Polyline, Rect as SvgRect, Font,
} from 'npm:@react-pdf/renderer@4.1.5'

// Reemplaza la fuente estándar (Helvetica) — el intento anterior falló con
// "Cannot read properties of undefined (reading 'unitsPerEm')" al medir
// texto con Helvetica, la fuente base-14 bundleada. Acá se registra
// explícitamente un TTF real desde fonts.gstatic.com en vez de depender de
// ese mecanismo interno.
Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf',
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Roboto' },
  title: { fontSize: 20, marginBottom: 12 },
  text: { fontSize: 12, marginBottom: 8, color: '#333333' },
  rectLabel: { fontSize: 10, marginTop: 6, color: '#666666' },
})

function buildDocument() {
  // Datos de línea hardcodeados — puntos de un polyline simple, sin
  // ninguna librería de charting: @react-pdf/renderer expone primitivas
  // SVG (Svg/Polyline/Rect) de bajo nivel, no un componente de gráfico.
  const points = '0,140 50,100 100,120 150,60 200,80 250,20 300,40'

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'Test PDF — @react-pdf/renderer en Deno Edge Function'),
      React.createElement(Text, { style: styles.text }, 'Texto simple de prueba, generado sin navegador ni html2canvas.'),
      React.createElement(View, {
        style: { width: 120, height: 50, backgroundColor: '#e5182b', marginTop: 12 },
      }),
      React.createElement(Text, { style: styles.rectLabel }, 'Rectángulo de color (#e5182b) — View con backgroundColor.'),
      React.createElement(
        Svg,
        { width: 300, height: 150, style: { marginTop: 24 } },
        React.createElement(SvgRect, { x: 0, y: 0, width: 300, height: 150, fill: '#f5f5f5' }),
        React.createElement(Polyline, { points, fill: 'none', stroke: '#e5182b', strokeWidth: 2 }),
      ),
      React.createElement(Text, { style: styles.rectLabel }, 'Gráfico de línea básico — Svg + Polyline con puntos hardcodeados.'),
    ),
  )
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const buffer = await renderToBuffer(buildDocument())
    return new Response(buffer, {
      headers: { ...CORS, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="test.pdf"' },
    })
  } catch (err) {
    console.error('[test-pdf-render] failed:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
