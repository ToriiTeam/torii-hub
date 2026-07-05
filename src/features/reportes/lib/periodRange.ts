import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PeriodType } from '../types';

export interface PeriodInput {
  periodType: PeriodType;
  year: number;
  month: number; // 1-12, used when periodType === 'month'
  weekStart: string; // yyyy-MM-dd (a Monday), used when periodType === 'week'
  customSince: string; // yyyy-MM-dd, used when periodType === 'custom'
  customUntil: string; // yyyy-MM-dd, used when periodType === 'custom'
}

export interface PeriodRange {
  fechaInicio: string; // yyyy-MM-dd
  fechaFin: string; // yyyy-MM-dd
  label: string; // human-readable, for the PDF cover/preview and the wizard header
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

// Single source of truth for turning whichever period fields are relevant
// (month, week, or custom) into a concrete [fechaInicio, fechaFin] range —
// used by loadMetrics (what to query) and by the wizard/PDF (what to
// display and what to persist on the `reports` row).
export function getPeriodRange(input: PeriodInput): PeriodRange {
  if (input.periodType === 'week') {
    const start = new Date(`${input.weekStart}T00:00:00`);
    const end = addDays(start, 6);
    return {
      fechaInicio: input.weekStart,
      fechaFin: fmt(end),
      label: `Semana del ${format(start, 'dd')} al ${format(end, 'dd \'de\' MMMM yyyy', { locale: es })}`,
    };
  }

  if (input.periodType === 'custom') {
    const since = input.customSince || fmt(new Date());
    const until = input.customUntil || since;
    return {
      fechaInicio: since,
      fechaFin: until,
      label: `${format(new Date(`${since}T00:00:00`), 'dd/MM/yyyy')} — ${format(new Date(`${until}T00:00:00`), 'dd/MM/yyyy')}`,
    };
  }

  // 'month'
  const monthDate = new Date(input.year, input.month - 1, 1);
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });
  return {
    fechaInicio: fmt(startOfMonth(monthDate)),
    fechaFin: fmt(endOfMonth(monthDate)),
    label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
  };
}
