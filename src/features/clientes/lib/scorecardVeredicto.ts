// Tipado propio del retorno de get_scorecard_salud: el generador de tipos de
// Supabase no infiere nullability en funciones plpgsql que retornan TABLE,
// pero la función sí devuelve NULL en varios campos (todo el row cuando
// sin_campana=true, o campos puntuales como close_rate_real/conversion
// cuando no hay suficiente data). Ver supabase/migrations/20260817020000_get_scorecard_salud.sql.
export interface ScorecardSalud {
  client_id: string;
  sin_campana: boolean;
  effective_start_date: string | null;
  dias_desde_arranque_real: number | null;
  mes_actual: number | null;
  pauta_acumulada: number | null;
  comision: number | null;
  ciclo_venta: number | null;
  engage_ok: boolean | null;
  shows_calif_acum: number | null;
  cierres_pago_acum: number | null;
  cierres_referido_acum: number | null;
  costo_total: number | null;
  n_breakeven: number | null;
  objetivo_verde: number | null;
  shows_esperados_be: number | null;
  shows_esperados_verde: number | null;
  cierres_esperados_be: number | null;
  close_rate_real: number | null;
  entrega: string | null;
  conversion: string | null;
  veredicto: string | null;
}

export type VeredictoColor = 'verde' | 'rojo' | 'amarillo' | 'neutro';

const VEREDICTO_COLORS: Record<string, VeredictoColor> = {
  'VERDE': 'verde',
  'ROJO Conversión (asesor)': 'rojo',
  'ROJO Profundo': 'rojo',
  'AMARILLO — Engagement': 'amarillo',
  'Amarillo — Entrega (Torii)': 'amarillo',
  'Amarillo — poca data': 'amarillo',
  'Amarillo — conversión al límite': 'amarillo',
  'Insuficientes datos': 'neutro',
};

const TARGET = 0.30;
const MUY_BUENO_THRESHOLD = TARGET * 1.5;

// Nomenclatura visible en pantalla (badges/pills/tooltips) — nunca "buena"/
// "mala", solo estos 4 niveles. Ver supabase/migrations/20260817030000_*.sql
// para las reglas que producen entrega/conversion.
export function entregaLabel(entrega: string | null | undefined): string {
  switch (entrega) {
    case 'Verde': return 'Muy bueno';
    case 'OK': return 'Bueno';
    case 'Bajo': return 'Crítico';
    case 'Insuficientes datos': return 'Insuficientes datos';
    default: return '—';
  }
}

export function conversionLabel(conversion: string | null | undefined, closeRateReal: number | null | undefined): string {
  switch (conversion) {
    case 'OK': return (closeRateReal ?? 0) >= MUY_BUENO_THRESHOLD ? 'Muy bueno' : 'Bueno';
    case 'Límite': return 'Bueno';
    case 'Bajo': return 'Crítico';
    case 'Sin data': return 'Insuficientes datos';
    default: return '—';
  }
}

// Severidad para el color/ícono del pill — mismos 4 niveles, sin depender
// del texto exacto de entregaLabel/conversionLabel.
export type PillSeverity = 'muybueno' | 'bueno' | 'critico' | 'neutro';

export function entregaSeverity(entrega: string | null | undefined): PillSeverity {
  switch (entrega) {
    case 'Verde': return 'muybueno';
    case 'OK': return 'bueno';
    case 'Bajo': return 'critico';
    default: return 'neutro';
  }
}

export function conversionSeverity(conversion: string | null | undefined, closeRateReal: number | null | undefined): PillSeverity {
  switch (conversion) {
    case 'OK': return (closeRateReal ?? 0) >= MUY_BUENO_THRESHOLD ? 'muybueno' : 'bueno';
    case 'Límite': return 'bueno';
    case 'Bajo': return 'critico';
    default: return 'neutro';
  }
}

export function veredictoColor(scorecard: ScorecardSalud | undefined): VeredictoColor {
  if (!scorecard || scorecard.sin_campana) return 'neutro';
  if (!scorecard.veredicto) return 'neutro';
  return VEREDICTO_COLORS[scorecard.veredicto] ?? 'neutro';
}

export function veredictoLabel(scorecard: ScorecardSalud | undefined): string {
  if (!scorecard) return 'Cargando…';
  if (scorecard.sin_campana) return 'Sin campaña activa';
  return scorecard.veredicto ?? 'Sin datos';
}

function formatPct(value: number | null): string {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function formatNum(value: number | null, decimals = 1): string {
  return value == null ? '—' : value.toFixed(decimals);
}

// Detalle que justifica el color, para el tooltip de la tarjeta.
export function veredictoDetail(scorecard: ScorecardSalud | undefined): string {
  if (!scorecard) return 'Calculando salud del cliente…';
  if (scorecard.sin_campana) return 'Todavía no hay fecha real de arranque de campaña (sin datos de pauta ni fecha de inicio).';
  return [
    `Mes ${scorecard.mes_actual ?? '—'} · Pauta acum. $${formatNum(scorecard.pauta_acumulada, 0)}`,
    `Shows calif.: ${scorecard.shows_calif_acum ?? '—'} / ${formatNum(scorecard.shows_esperados_be)} esperados BE`,
    `Close rate: ${formatPct(scorecard.close_rate_real)} (${scorecard.conversion ?? '—'})`,
    `Entrega: ${scorecard.entrega ?? '—'}`,
  ].join('\n');
}
