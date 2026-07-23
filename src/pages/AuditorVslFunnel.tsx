import { useEffect, useState } from 'react';
import { PeriodSelector } from '@/features/executive-dashboard/components/shared/PeriodSelector';
import { VslFunnelView } from '@/features/executive-dashboard/components/VslFunnelView';
import { fetchAuditorVslFunnelData } from '@/features/executive-dashboard/lib/fetchAuditorVslFunnel';
import { getPeriodRange, clampToNuevoTorii, type PeriodType, type PresetKey } from '@/features/executive-dashboard/lib/periodRange';
import type { VslFunnelMetrics } from '@/features/executive-dashboard/types';
import type { VslFunnelData } from '@/features/executive-dashboard/lib/fetchVslFunnel';

// Auditor's entire Dashboard Ejecutivo experience: no client selector (Torii
// is the only thing this role can ever see — see AccountContext.tsx's
// hardcoded LM Social Constructions match for the same pattern on
// /meta-ads), no Resumen tab, no Nuevo/Viejo Torii toggle (defaults to
// Nuevo Torii, same as everyone else, just not user-controllable here).
// Reuses VslFunnelView — the only thing that differs from the regular
// Torii → VSL Funnel tab is where the data comes from (fetchAuditorVslFunnel.ts,
// a lean query that never touches the tables this role is locked out of).
export default function AuditorVslFunnel() {
  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('preset');
  const [preset, setPreset] = useState<PresetKey>('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [customSince, setCustomSince] = useState(() => now.toISOString().slice(0, 10));
  const [customUntil, setCustomUntil] = useState(() => now.toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<VslFunnelMetrics | null>(null);
  const [vslFunnelData, setVslFunnelData] = useState<VslFunnelData | null>(null);

  const range = getPeriodRange({ periodType, preset, year, month, customSince, customUntil });
  const toriiRange = { ...range, ...clampToNuevoTorii(range.since, range.until) };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAuditorVslFunnelData(toriiRange.since, toriiRange.until)
      .then((result) => {
        if (cancelled) return;
        setMetrics(result.metrics);
        setVslFunnelData(result.vslFunnelData);
      })
      .catch((err) => console.error('[AuditorVslFunnel] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, preset, year, month, customSince, customUntil]);

  const navMonth = (dir: 'prev' | 'next') => {
    const next = dir === 'prev'
      ? (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 })
      : (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });
    setYear(next.year);
    setMonth(next.month);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Ejecutivo — VSL Funnel</h1>
        <p className="text-sm text-muted-foreground">Torii — LM Social Constructions / torii-principal</p>
      </div>

      <PeriodSelector
        periodType={periodType}
        preset={preset}
        monthLabel={range.label}
        customSince={customSince}
        customUntil={customUntil}
        onPresetChange={(p) => { setPeriodType('preset'); setPreset(p); }}
        onModeChange={setPeriodType}
        onNavMonth={navMonth}
        onCustomChange={(since, until) => { setCustomSince(since); setCustomUntil(until); }}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        metrics && vslFunnelData && (
          <VslFunnelView metrics={metrics} vslFunnelData={vslFunnelData} nuevoToriiOnly />
        )
      )}
    </div>
  );
}
