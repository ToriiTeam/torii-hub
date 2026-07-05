export interface ReportMetrics {
  inversionTotal: number;
  leads: number;
  cpl: number | null;
  reuniones: number;
  cpbc: number | null;
  conversionLeadReunion: number | null; // reuniones / leads
  showRate: number | null; // asistencia / reuniones (0-100)
  cierres: number;
}

export const EMPTY_METRICS: ReportMetrics = {
  inversionTotal: 0,
  leads: 0,
  cpl: null,
  reuniones: 0,
  cpbc: null,
  conversionLeadReunion: null,
  showRate: null,
  cierres: 0,
};

export interface ReportNarrativa {
  resumenEjecutivo: string;
  aprendizajes: string;
  diagnostico: string;
  planAccion: string;
  recomendaciones: string;
  proximosPasos: string;
}

export const EMPTY_NARRATIVA: ReportNarrativa = {
  resumenEjecutivo: '',
  aprendizajes: '',
  diagnostico: '',
  planAccion: '',
  recomendaciones: '',
  proximosPasos: '',
};

export interface TrendPoint {
  fecha: string; // yyyy-MM-dd (week_start of the underlying client_metrics row)
  inversion: number;
  leads: number;
}

export interface Report {
  id: string;
  client_id: string;
  mes: string; // yyyy-MM-dd, first day of month
  metricas: ReportMetrics;
  narrativa: ReportNarrativa;
  pdf_url: string | null;
  enviado: boolean;
  enviado_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportWithClient extends Report {
  clientName: string;
  clientEmail: string | null;
}
