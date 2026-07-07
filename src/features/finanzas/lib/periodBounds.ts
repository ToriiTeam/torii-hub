import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export interface PeriodBounds {
  monthStart: string; // yyyy-MM-dd
  monthEnd: string;
  yearStart: string;
  yearEnd: string;
}

// yearEnd is the actual calendar year end (Dec 31), not "through the active
// month" — Resultado's 12-month table needs the whole year regardless of
// which month is active. A tab that needs a partial-year cutoff (e.g.
// Dashboard's "acumulado del año activo" running only through the active
// month) composes its own range as [yearStart, monthEnd] instead of adding
// a special field here.
export function getPeriodBounds(activeMonth: Date): PeriodBounds {
  return {
    monthStart: format(startOfMonth(activeMonth), 'yyyy-MM-dd'),
    monthEnd: format(endOfMonth(activeMonth), 'yyyy-MM-dd'),
    yearStart: format(startOfYear(activeMonth), 'yyyy-MM-dd'),
    yearEnd: format(endOfYear(activeMonth), 'yyyy-MM-dd'),
  };
}
