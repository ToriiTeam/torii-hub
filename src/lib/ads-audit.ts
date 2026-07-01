// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'critical' | 'warning' | 'opportunity' | 'info';
export type HealthStatus  = 'excellent' | 'good' | 'warning' | 'critical';

export interface AuditRecommendation {
  id: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  action: string;
  metric?: string;
  metricValue?: number;
}

export interface AuditPeriodInput {
  totalInversion: number;
  totalTypeforms: number;
  totalCalificados: number;
  totalAsistencia: number;
  totalCerrados: number;
  avgCpbc: number | null;
  avgCpl: number | null;
  avgCtr: number;
  precio: number | null;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

// LATAM fallback (USD) when client_csb.precio is unavailable
const LATAM = { excellent: 50, good: 120, warning: 200 };

// Fixed thresholds independent of price
const CTR_CRITICAL       = 0.5;   // % — very low creative engagement
const SPEND_NO_LEADS     = 300;   // $ — spend without any lead
const QUAL_RATE_MIN      = 0.20;  // typeforms_calificados / typeforms
const SHOW_RATE_MIN      = 0.50;  // asistencia / calificados

export interface CpbcThresholds {
  excellent: number;
  good: number;
  warning: number;
  usingPrice: boolean;
}

export function getCpbcThresholds(precio: number | null): CpbcThresholds {
  const p = precio && precio > 0 ? precio : null;
  return {
    excellent:  p ? p * 0.015 : LATAM.excellent,
    good:       p ? p * 0.04  : LATAM.good,
    warning:    p ? p * 0.07  : LATAM.warning,
    usingPrice: p != null,
  };
}

// ─── Health status ────────────────────────────────────────────────────────────

export function getHealthStatus(period: AuditPeriodInput): HealthStatus {
  const T = getCpbcThresholds(period.precio);
  const { avgCpbc, avgCtr, totalInversion, totalTypeforms } = period;

  if (totalInversion > SPEND_NO_LEADS && totalTypeforms === 0) return 'critical';
  if (avgCpbc != null && avgCpbc > T.warning) return 'critical';
  if (avgCpbc != null && avgCpbc > T.good) return 'warning';
  if (avgCtr > 0 && avgCtr < CTR_CRITICAL) return 'warning';
  if (avgCpbc != null && avgCpbc <= T.excellent && totalTypeforms > 0) return 'excellent';
  return 'good';
}

// ─── Audit engine ─────────────────────────────────────────────────────────────

export function auditPeriod(period: AuditPeriodInput): AuditRecommendation[] {
  const T = getCpbcThresholds(period.precio);
  const recs: AuditRecommendation[] = [];
  const {
    totalInversion, totalTypeforms, totalCalificados,
    totalAsistencia, avgCpbc, avgCtr,
  } = period;

  const pctLabel = T.usingPrice ? 'del precio del servicio' : 'benchmark LATAM';

  // 1 — CPBC crítico
  if (avgCpbc != null && avgCpbc > T.warning && totalCalificados > 0) {
    recs.push({
      id: 'cpbc-critical', severity: 'critical',
      title: 'CPBC por encima del umbral crítico',
      description: `CPBC de $${avgCpbc.toFixed(0)} supera el umbral crítico de $${T.warning.toFixed(0)} (7% ${pctLabel}).`,
      action: 'Revisá segmentación, creativos y oferta. El costo de adquisición hace inviable el negocio.',
      metric: 'CPBC', metricValue: avgCpbc,
    });
  }

  // 2 — CPBC en zona warning
  if (avgCpbc != null && avgCpbc > T.good && avgCpbc <= T.warning && totalCalificados > 0) {
    recs.push({
      id: 'cpbc-warning', severity: 'warning',
      title: 'CPBC por encima del benchmark',
      description: `CPBC de $${avgCpbc.toFixed(0)} supera el objetivo de $${T.good.toFixed(0)} (4% ${pctLabel}).`,
      action: 'Analizá qué creativos o audiencias tienen mayor CPBC y pausá los menos eficientes.',
      metric: 'CPBC', metricValue: avgCpbc,
    });
  }

  // 3 — Gasto sin leads
  if (totalInversion > SPEND_NO_LEADS && totalTypeforms === 0) {
    recs.push({
      id: 'spend-no-leads', severity: 'critical',
      title: 'Inversión sin leads generados',
      description: `$${totalInversion.toFixed(0)} invertidos sin ningún typeform en el período.`,
      action: 'Verificá que el pixel esté activo, el formulario funcione y la audiencia sea correcta.',
      metric: 'Leads', metricValue: 0,
    });
  }

  // 4 — CTR bajo
  if (avgCtr > 0 && avgCtr < CTR_CRITICAL && totalInversion > 100) {
    recs.push({
      id: 'ctr-low', severity: 'warning',
      title: 'CTR muy bajo',
      description: `CTR de ${avgCtr.toFixed(2)}%, por debajo del mínimo esperado (${CTR_CRITICAL}%).`,
      action: 'Probá nuevas creatividades y copies. El hook del video o imagen no está funcionando.',
      metric: 'CTR', metricValue: avgCtr,
    });
  }

  // 5 — Tasa de calificación baja
  if (totalTypeforms > 5 && totalCalificados / totalTypeforms < QUAL_RATE_MIN) {
    const rate = totalCalificados / totalTypeforms;
    recs.push({
      id: 'qual-rate-low', severity: 'warning',
      title: 'Tasa de calificación baja',
      description: `Solo el ${(rate * 100).toFixed(0)}% de los leads se califica (${totalCalificados}/${totalTypeforms}).`,
      action: 'Revisá segmentación y landing page. Probablemente estés captando leads fuera del ICP.',
      metric: 'Tasa de calificación', metricValue: rate * 100,
    });
  }

  // 6 — Show rate bajo
  if (totalCalificados > 3 && totalAsistencia / totalCalificados < SHOW_RATE_MIN) {
    const rate = totalAsistencia / totalCalificados;
    recs.push({
      id: 'show-rate-low', severity: 'warning',
      title: 'Show rate bajo',
      description: `Solo el ${(rate * 100).toFixed(0)}% de los calificados asiste a la llamada (${totalAsistencia}/${totalCalificados}).`,
      action: 'Revisá el proceso de pre-call: recordatorios, urgencia y el tiempo entre agenda y llamada.',
      metric: 'Show rate', metricValue: rate * 100,
    });
  }

  // 7 — Oportunidad de escalar
  if (avgCpbc != null && avgCpbc <= T.excellent && totalInversion > 100 && totalCalificados >= 2) {
    recs.push({
      id: 'scale-opportunity', severity: 'opportunity',
      title: '¡Oportunidad de escalar!',
      description: `CPBC de $${avgCpbc.toFixed(0)}, por debajo del objetivo excelente ($${T.excellent.toFixed(0)}). Las campañas rinden excelente.`,
      action: 'Incrementá el presupuesto 20–30% gradualmente. No cambies segmentación ni creativos.',
      metric: 'CPBC', metricValue: avgCpbc,
    });
  }

  const order: Record<string, number> = { critical: 0, warning: 1, opportunity: 2, info: 3 };
  return recs.sort((a, b) => order[a.severity] - order[b.severity]);
}
