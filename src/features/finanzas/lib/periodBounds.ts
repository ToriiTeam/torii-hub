import { getPeriodRange, type PeriodInput } from '@/features/executive-dashboard/lib/periodRange';

export interface PeriodBounds {
  periodStart: string; // yyyy-MM-dd — the literal selected filter (7d/30d/90d/Todo/Mes/Personalizado)
  periodEnd: string;
  periodLabel: string;
  currentYear: number;
  yearStart: string; // yyyy-01-01
  yearEnd: string;   // yyyy-12-31
}

// Year-scoped sections (Resultado's 12-month table, Métricas' "Rentabilidad
// acumulado {año}", Dashboard's "Acumulado {año}") need a real single
// calendar year no matter what — "Todo"/7d/30d/90d/Personalizado don't
// carry one. Rule: when the period selector is in 'month' mode, anchor to
// the year of the navigated month (preserves browsing to past years via
// the ← → arrows); for every other mode, anchor to the real current
// calendar year, since there's nothing else to anchor to.
export function getPeriodBounds(input: PeriodInput): PeriodBounds {
  const range = getPeriodRange(input);
  const currentYear = input.periodType === 'month' ? input.year : new Date().getFullYear();

  return {
    periodStart: range.since,
    periodEnd: range.until,
    periodLabel: range.label,
    currentYear,
    yearStart: `${currentYear}-01-01`,
    yearEnd: `${currentYear}-12-31`,
  };
}
