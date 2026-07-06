import { addDays, endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export type PeriodType = 'preset' | 'month' | 'custom';
export type PresetKey = '7d' | '30d' | '90d' | 'all';

export interface PeriodInput {
  periodType: PeriodType;
  preset: PresetKey;
  year: number;
  month: number; // 1-12, used when periodType === 'month'
  customSince: string; // yyyy-MM-dd
  customUntil: string; // yyyy-MM-dd
}

export interface PeriodRangeResult {
  since: string;
  until: string;
  label: string;
  // <=31 days → daily chart granularity; longer → weekly buckets, so a
  // 90-day view doesn't render 90 bars/points.
  isShortPeriod: boolean;
}

// No real data predates this project — used as "since" for the "Todo"
// preset instead of leaving the lower bound open, so every fetch function
// keeps its existing (since, until) string signature.
const ALL_TIME_SINCE = '2000-01-01';

const PRESET_DAYS: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 };
const PRESET_LABELS: Record<PresetKey, string> = {
  '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', '90d': 'Últimos 90 días', all: 'Todo el historial',
};

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function getPeriodRange(input: PeriodInput): PeriodRangeResult {
  if (input.periodType === 'month') {
    const d = new Date(input.year, input.month - 1, 1);
    const label = format(d, 'MMMM yyyy', { locale: es });
    return {
      since: fmt(startOfMonth(d)),
      until: fmt(endOfMonth(d)),
      label: label.charAt(0).toUpperCase() + label.slice(1),
      isShortPeriod: true,
    };
  }

  if (input.periodType === 'custom') {
    const since = input.customSince || fmt(new Date());
    const until = input.customUntil || since;
    const days = Math.round((new Date(`${until}T00:00:00`).getTime() - new Date(`${since}T00:00:00`).getTime()) / 86400000);
    return {
      since,
      until,
      label: `${format(new Date(`${since}T00:00:00`), 'dd/MM/yyyy')} — ${format(new Date(`${until}T00:00:00`), 'dd/MM/yyyy')}`,
      isShortPeriod: days <= 31,
    };
  }

  // 'preset'
  const today = new Date();
  if (input.preset === 'all') {
    return { since: ALL_TIME_SINCE, until: fmt(today), label: PRESET_LABELS.all, isShortPeriod: false };
  }
  const days = PRESET_DAYS[input.preset];
  return { since: fmt(subDays(today, days - 1)), until: fmt(today), label: PRESET_LABELS[input.preset], isShortPeriod: days <= 31 };
}

// Previous period of equal length, ending the day before the current one
// starts — same rule meta-ads-proxy already uses for its "vs previous
// period" comparisons, generalized here beyond just calendar months.
export function previousPeriodRange(since: string, until: string): { since: string; until: string } {
  const s = new Date(`${since}T00:00:00`);
  const e = new Date(`${until}T00:00:00`);
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevUntil = subDays(s, 1);
  const prevSince = subDays(prevUntil, days - 1);
  return { since: fmt(prevSince), until: fmt(prevUntil) };
}

export function eachDay(since: string, until: string): string[] {
  const days: string[] = [];
  let cur = new Date(`${since}T00:00:00`);
  const end = new Date(`${until}T00:00:00`);
  while (cur <= end) {
    days.push(fmt(cur));
    cur = addDays(cur, 1);
  }
  return days;
}
