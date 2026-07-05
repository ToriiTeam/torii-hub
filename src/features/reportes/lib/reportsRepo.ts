import { supabase } from '@/integrations/supabase/client';
import type { Report, ReportMetrics, ReportNarrativa, ReportWithClient } from '../types';

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
}

function toReport(row: any): Report {
  return {
    id: row.id,
    client_id: row.client_id,
    mes: row.mes,
    metricas: (row.metricas ?? {}) as ReportMetrics,
    narrativa: (row.narrativa ?? {}) as ReportNarrativa,
    pdf_url: row.pdf_url,
    enviado: row.enviado ?? false,
    enviado_at: row.enviado_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listReports(): Promise<ReportWithClient[]> {
  const [{ data: reports, error: reportsErr }, { data: clients, error: clientsErr }] = await Promise.all([
    supabase.from('reports').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, email'),
  ]);
  if (reportsErr) throw reportsErr;
  if (clientsErr) throw clientsErr;

  const clientById = new Map<string, ClientRow>((clients ?? []).map((c) => [c.id, c]));

  return (reports ?? []).map((row) => {
    const report = toReport(row);
    const client = clientById.get(report.client_id);
    return {
      ...report,
      clientName: client?.name ?? 'Cliente desconocido',
      clientEmail: client?.email ?? null,
    };
  });
}

export async function createReport(input: {
  client_id: string;
  mes: string; // yyyy-MM-dd
  metricas: ReportMetrics;
  narrativa: ReportNarrativa;
}): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      client_id: input.client_id,
      mes: input.mes,
      metricas: input.metricas as any,
      narrativa: input.narrativa as any,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toReport(data);
}

export async function updateReportPdfUrl(id: string, pdfUrl: string): Promise<void> {
  const { error } = await supabase.from('reports').update({ pdf_url: pdfUrl }).eq('id', id);
  if (error) throw error;
}

export async function markReportSent(id: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ enviado: true, enviado_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function uploadReportPdf(reportId: string, clientSlug: string, mes: string, blob: Blob): Promise<string> {
  const path = `${clientSlug}/${mes}-${reportId}.pdf`;
  const { error } = await supabase.storage.from('reports').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('reports').getPublicUrl(path);
  return data.publicUrl;
}
