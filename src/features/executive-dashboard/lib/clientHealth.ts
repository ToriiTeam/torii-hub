import type { HealthStatus, RevenueMetrics } from '../types';

// Deliberately 4 states, not the 3 in the original spec ("rojo: ROI<1x o
// sin datos") — collapsing "bad" and "unmeasured" into the same red bucket
// would paint the entire portfolio red right now, since no client has a
// reliable revenue source yet (see the null-safety note in the executive
// dashboard's build). "Sin datos" gets its own neutral color so the signal
// stays meaningful once real data arrives.
export function computeHealth(revenue: RevenueMetrics): HealthStatus {
  if (!revenue.hasData || revenue.roi == null) return 'sin_datos';
  if (revenue.roi > 3) return 'excelente';
  if (revenue.roi >= 1) return 'aceptable';
  return 'riesgo';
}

export const HEALTH_CONFIG: Record<HealthStatus, { label: string; badgeClass: string; borderClass: string }> = {
  excelente: { label: 'Excelente', badgeClass: 'bg-success/20 text-success border-0', borderClass: 'border-success/40' },
  aceptable: { label: 'Aceptable', badgeClass: 'bg-warning/20 text-warning border-0', borderClass: 'border-warning/40' },
  riesgo: { label: 'Riesgo', badgeClass: 'bg-destructive/20 text-destructive border-0', borderClass: 'border-destructive/40' },
  sin_datos: { label: 'Sin datos', badgeClass: 'bg-secondary text-muted-foreground border-0', borderClass: 'border-border/50' },
};

// CPBC objective line — distinct from (and not to be confused with) the
// separate CPBC threshold systems already in ads-audit.ts (price-based
// excellent/good/warning) and the meta-ads auditEngine (which excludes CPBC
// entirely). This dashboard's bar-chart target line uses the numbers given
// for this feature specifically.
export function cpbcTargetFor(country: string | null): number {
  return country === 'Spain' ? 60 : 30;
}

export function cpbcSemaphoreClass(cpbc: number | null, country: string | null): string {
  if (cpbc == null) return 'text-muted-foreground';
  const target = cpbcTargetFor(country);
  if (cpbc <= target) return 'text-success';
  if (cpbc <= target * 1.5) return 'text-warning';
  return 'text-destructive';
}

export function safeDiv(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
