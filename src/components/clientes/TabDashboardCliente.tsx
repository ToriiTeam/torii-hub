import { useEffect, useState } from 'react';
import { PeriodSelector } from '@/features/executive-dashboard/components/shared/PeriodSelector';
import { ClientView } from '@/features/executive-dashboard/components/ClientView';
import { fetchClientData } from '@/features/executive-dashboard/lib/fetchClientData';
import { getPeriodRange, type PeriodType, type PresetKey } from '@/features/executive-dashboard/lib/periodRange';
import type { ClientDetailData } from '@/features/executive-dashboard/types';

// Mismo ClientView.tsx que usa el modo "Torii" del sidebar en
// ExecutiveDashboard.tsx (/dashboard) — acá se le pasa el client_id de la
// ruta en vez de leerlo de un Select interno. Estado de período propio,
// igual patrón que ExecutiveDashboard/Finanzas (sin Portfolio/Torii/toggle
// "Nuevo Torii" — esos son exclusivos de la vista de portfolio).
function navMonth(year: number, month: number, dir: 'prev' | 'next'): { year: number; month: number } {
  if (dir === 'prev') return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

interface Props {
  clientId: string;
}

export default function TabDashboardCliente({ clientId }: Props) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('preset');
  const [preset, setPreset] = useState<PresetKey>('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [customSince, setCustomSince] = useState(() => now.toISOString().slice(0, 10));
  const [customUntil, setCustomUntil] = useState(() => now.toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientDetailData | null>(null);

  const range = getPeriodRange({ periodType, preset, year, month, customSince, customUntil });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchClientData(clientId, range.since, range.until, range.isShortPeriod)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => console.error('[TabDashboardCliente] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, periodType, preset, year, month, customSince, customUntil]);

  return (
    <div className="space-y-6">
      <PeriodSelector
        periodType={periodType}
        preset={preset}
        monthLabel={range.label}
        customSince={customSince}
        customUntil={customUntil}
        onPresetChange={(p) => { setPeriodType('preset'); setPreset(p); }}
        onModeChange={setPeriodType}
        onNavMonth={(dir) => { const n = navMonth(year, month, dir); setYear(n.year); setMonth(n.month); }}
        onCustomChange={(since, until) => { setCustomSince(since); setCustomUntil(until); }}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        data && <ClientView data={data} />
      )}
    </div>
  );
}
