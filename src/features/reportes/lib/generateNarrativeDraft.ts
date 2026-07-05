import { supabase } from '@/integrations/supabase/client';
import type { ReportMetrics, ReportNarrativa } from '../types';

interface AiNarrativeFields {
  resumen_ejecutivo: string;
  aprendizajes_funcionaron: string;
  aprendizajes_descartado: string;
  hipotesis_validadas: string;
  hipotesis_pendientes: string;
  cuello_de_botella: string;
  proximos_pasos: string;
  necesitamos_del_cliente: string;
  aumentara_exito: string;
  expectativas: string;
}

// clients has no "nicho" column (only offer_type, which is always 'DFY' —
// a delivery model, not an industry) — the real niche lives per-lead on
// client_closer_calls.nicho. Best-effort: most frequent value for this
// client in the period, or null if there's nothing to go on.
async function fetchClientNicho(clientId: string, since: string, until: string): Promise<string | null> {
  const { data } = await supabase
    .from('client_closer_calls')
    .select('nicho')
    .eq('client_id', clientId)
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until)
    .not('nicho', 'is', null);

  if (!data || data.length === 0) return null;

  const counts = new Map<string, number>();
  for (const row of data) {
    if (!row.nicho) continue;
    counts.set(row.nicho, (counts.get(row.nicho) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

// The AI returns 10 fields (see generate-report-narrative's tool schema),
// but the wizard's ReportNarrativa only has 6 (Step3/4/5 predate this
// feature) — combine rather than drop any of the 10, with a subheading per
// source field so it's still legible which AI output landed where.
function mapAiFieldsToNarrativa(ai: AiNarrativeFields): ReportNarrativa {
  return {
    resumenEjecutivo: ai.resumen_ejecutivo,
    aprendizajes: [
      `Qué funcionó:\n${ai.aprendizajes_funcionaron}`,
      `Qué se descartó:\n${ai.aprendizajes_descartado}`,
      `Hipótesis validadas:\n${ai.hipotesis_validadas}`,
      `Hipótesis pendientes:\n${ai.hipotesis_pendientes}`,
    ].join('\n\n'),
    diagnostico: `Cuello de botella principal: ${ai.cuello_de_botella}`,
    planAccion: ai.proximos_pasos,
    recomendaciones: ai.aumentara_exito,
    proximosPasos: [
      `Qué necesitamos de tu parte:\n${ai.necesitamos_del_cliente}`,
      `Expectativas para el próximo período:\n${ai.expectativas}`,
    ].join('\n\n'),
  };
}

export async function generateNarrativeDraft(input: {
  clientId: string;
  clientName: string;
  periodLabel: string;
  fechaInicio: string;
  fechaFin: string;
  metrics: ReportMetrics;
}): Promise<ReportNarrativa> {
  const [{ data: client }, nicho] = await Promise.all([
    supabase.from('clients').select('country').eq('id', input.clientId).single(),
    fetchClientNicho(input.clientId, input.fechaInicio, input.fechaFin),
  ]);

  const { data, error } = await supabase.functions.invoke('generate-report-narrative', {
    body: {
      clientName: input.clientName,
      country: client?.country ?? null,
      nicho,
      periodLabel: input.periodLabel,
      metrics: {
        inversionTotal: input.metrics.inversionTotal,
        leads: input.metrics.leads,
        cpl: input.metrics.cpl,
        reuniones: input.metrics.reuniones,
        cpbc: input.metrics.cpbc,
        showRate: input.metrics.showRate,
        cierres: input.metrics.cierres,
        cac: input.metrics.cac,
      },
    },
  });
  if (error) throw error;

  return mapAiFieldsToNarrativa(data.data as AiNarrativeFields);
}
