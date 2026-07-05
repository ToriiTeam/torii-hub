import { useCallback, useState } from 'react';
import { EMPTY_METRICS, EMPTY_NARRATIVA, type ReportMetrics, type ReportNarrativa, type TrendPoint } from '../types';
import { fetchMonthlyMetrics } from '../lib/fetchMonthlyMetrics';

export interface ReportDraft {
  clientId: string;
  clientName: string;
  year: number;
  month: number; // 1-12
  metrics: ReportMetrics;
  metricsAutoFilled: boolean; // false until fetchMonthlyMetrics has run once
  trend: TrendPoint[];
  narrativa: ReportNarrativa;
}

const now = new Date();

function emptyDraft(): ReportDraft {
  return {
    clientId: '',
    clientName: '',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
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

  const setPeriod = useCallback((year: number, month: number) => {
    setDraft((d) => ({ ...d, year, month, metricsAutoFilled: false }));
  }, []);

  const setMetrics = useCallback((metrics: ReportMetrics) => {
    setDraft((d) => ({ ...d, metrics }));
  }, []);

  const setNarrativa = useCallback((narrativa: ReportNarrativa) => {
    setDraft((d) => ({ ...d, narrativa }));
  }, []);

  const loadMetrics = useCallback(async () => {
    if (!draft.clientId) return;
    setLoadingMetrics(true);
    try {
      const { metrics, trend } = await fetchMonthlyMetrics(draft.clientId, draft.year, draft.month);
      setDraft((d) => ({ ...d, metrics, trend, metricsAutoFilled: true }));
    } finally {
      setLoadingMetrics(false);
    }
  }, [draft.clientId, draft.year, draft.month]);

  const reset = useCallback(() => setDraft(emptyDraft()), []);

  return { draft, setClient, setPeriod, setMetrics, setNarrativa, loadMetrics, loadingMetrics, reset };
}
