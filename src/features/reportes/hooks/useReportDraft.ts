import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { EMPTY_METRICS, EMPTY_NARRATIVA, type PeriodType, type ReportMetrics, type ReportNarrativa, type TrendPoint } from '../types';
import { fetchMonthlyMetrics } from '../lib/fetchMonthlyMetrics';
import { getPeriodRange, type PeriodRange } from '../lib/periodRange';

export interface ReportDraft {
  clientId: string;
  clientName: string;
  periodType: PeriodType;
  year: number;
  month: number; // 1-12
  weekStart: string; // yyyy-MM-dd, a Monday
  customSince: string; // yyyy-MM-dd
  customUntil: string; // yyyy-MM-dd
  metrics: ReportMetrics;
  metricsAutoFilled: boolean;
  trend: TrendPoint[];
  narrativa: ReportNarrativa;
}

const now = new Date();

// Monday of the current week, as a starting default for the 'week' period type.
function mondayOf(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

function emptyDraft(): ReportDraft {
  return {
    clientId: '',
    clientName: '',
    periodType: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    weekStart: format(mondayOf(now), 'yyyy-MM-dd'),
    customSince: format(now, 'yyyy-MM-dd'),
    customUntil: format(now, 'yyyy-MM-dd'),
    metrics: EMPTY_METRICS,
    metricsAutoFilled: false,
    trend: [],
    narrativa: EMPTY_NARRATIVA,
  };
}

export function useReportDraft() {
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft());
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const setClient = useCallback((clientId: string, clientName: string) => {
    setDraft((d) => ({ ...d, clientId, clientName, metricsAutoFilled: false }));
  }, []);

  const setPeriodType = useCallback((periodType: PeriodType) => {
    setDraft((d) => ({ ...d, periodType, metricsAutoFilled: false }));
  }, []);

  const setMonthPeriod = useCallback((year: number, month: number) => {
    setDraft((d) => ({ ...d, year, month, metricsAutoFilled: false }));
  }, []);

  const setWeekStart = useCallback((weekStart: string) => {
    setDraft((d) => ({ ...d, weekStart, metricsAutoFilled: false }));
  }, []);

  const setCustomRange = useCallback((customSince: string, customUntil: string) => {
    setDraft((d) => ({ ...d, customSince, customUntil, metricsAutoFilled: false }));
  }, []);

  const setMetrics = useCallback((metrics: ReportMetrics) => {
    setDraft((d) => ({ ...d, metrics }));
  }, []);

  const setNarrativa = useCallback((narrativa: ReportNarrativa) => {
    setDraft((d) => ({ ...d, narrativa }));
  }, []);

  const periodRange: PeriodRange = getPeriodRange(draft);

  const loadMetrics = useCallback(async () => {
    if (!draft.clientId) return;
    setLoadingMetrics(true);
    try {
      const range = getPeriodRange(draft);
      const { metrics, trend } = await fetchMonthlyMetrics(draft.clientId, range.fechaInicio, range.fechaFin);
      setDraft((d) => ({ ...d, metrics, trend, metricsAutoFilled: true }));
    } finally {
      setLoadingMetrics(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.clientId, draft.periodType, draft.year, draft.month, draft.weekStart, draft.customSince, draft.customUntil]);

  const reset = useCallback(() => setDraft(emptyDraft()), []);

  return {
    draft,
    periodRange,
    setClient,
    setPeriodType,
    setMonthPeriod,
    setWeekStart,
    setCustomRange,
    setMetrics,
    setNarrativa,
    loadMetrics,
    loadingMetrics,
    reset,
  };
}
