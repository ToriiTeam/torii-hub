export interface ReportMetrics {
  inversionTotal: number;
  impresiones: number;
  clics: number;
  leads: number;
  cpl: number | null;
  cpmAprox: number | null; // inversión / alcance total
  reuniones: number;
  cpbc: number | null; // inversión / reuniones
  cac: number | null; // inversión / cierres
  conversionLeadReunion: number | null; // reuniones / leads
  showRate: number | null; // asistencia / reuniones (0-100)
  cierres: number;
  // true when ads_metricas_diarias has no rows for this client/month — the
  // metrics above are all zero/null in that case, not "actually zero spend".
  sinDatosMeta: boolean;
}

export const EMPTY_METRICS: ReportMetrics = {
  inversionTotal: 0,
  impresiones: 0,
  clics: 0,
  leads: 0,
  cpl: null,
  cpmAprox: null,
  reuniones: 0,
  cpbc: null,
  cac: null,
  conversionLeadReunion: null,
  showRate: null,
  cierres: 0,
  sinDatosMeta: true,
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
  fecha: string; // yyyy-MM-dd (real daily granularity, from ads_metricas_diarias)
  inversion: number;
  leads: number;
}

export type PeriodType = 'month' | 'week' | 'custom';

export interface Report {
  id: string;
  client_id: string;
  mes: string; // yyyy-MM-dd — kept for back-compat, equals fecha_inicio for 'month' reports
  periodo_tipo: PeriodType;
  fecha_inicio: string; // yyyy-MM-dd
  fecha_fin: string; // yyyy-MM-dd
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
