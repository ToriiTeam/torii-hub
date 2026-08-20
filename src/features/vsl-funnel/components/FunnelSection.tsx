import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { VslFunnelView } from '@/features/executive-dashboard/components/VslFunnelView';
import { PeriodSelector } from '@/features/executive-dashboard/components/shared/PeriodSelector';
import { fetchClientVslFunnelData } from '@/features/executive-dashboard/lib/fetchClientVslFunnel';
import { getPeriodRange, type PeriodType, type PresetKey } from '@/features/executive-dashboard/lib/periodRange';
import type { VslFunnelMetrics } from '@/features/executive-dashboard/types';
import type { VslFunnelData } from '@/features/executive-dashboard/lib/fetchVslFunnel';

interface Props {
  clientId: string;
  // A dónde manda "Ver métricas completas por landing/campaña" —
  // TabVSLFunnel.tsx pasa la ruta scopeada al cliente activo (/c/:id/vsl)
  // cuando corresponde, ver punto B/C. Sin default: si no viene, no se
  // muestra el link (p.ej. si algún día se monta sin un VSL Tracking
  // asociado).
  moreHref?: string;
}

// Sub-subsección "Funnel" del VSL Funnel — MISMAS cards que Dashboard
// Ejecutivo → Torii → VSL Funnel (Inversión/CPBC/Impresiones/Clicks/CPC/
// CTR/CPM/Plays/25%+/50%+/75%+/100%/Agendas/Llamadas efectivas/Cierres/No
// cierres), reusando VslFunnelView tal cual — solo cambia de dónde vienen
// los datos: fetchClientVslFunnelData (ads_campanas.client_id +
// client_closer_calls.client_id + vsl_events.client_id, todos scopeados a
// ESTE cliente) en vez de las cuentas propias de Torii. Se monta igual para
// un cliente real y para el casillero interno de Torii — mismo componente
// TabVSLFunnel.tsx para ambos, ninguna lógica de métricas nueva acá.
export function FunnelSection({ clientId, moreHref }: Props) {
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
  const [error, setError] = useState<string | null>(null);

  const range = getPeriodRange({ periodType, preset, year, month, customSince, customUntil });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClientVslFunnelData(clientId, range.since, range.until)
      .then((result) => {
        if (cancelled) return;
        setMetrics(result.metrics);
        setVslFunnelData(result.vslFunnelData);
      })
      .catch((err) => {
        console.error('[FunnelSection] load failed:', err);
        if (!cancelled) setError('No se pudieron cargar las métricas.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, periodType, preset, year, month, customSince, customUntil]);

  function navMonth(dir: 'prev' | 'next') {
    const next = dir === 'prev'
      ? (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 })
      : (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });
    setYear(next.year);
    setMonth(next.month);
  }

  return (
    <div className="space-y-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed border-destructive/40 p-8 text-center text-sm text-destructive">{error}</div>
      ) : metrics && vslFunnelData ? (
        <VslFunnelView
          metrics={metrics}
          vslFunnelData={vslFunnelData}
          nuevoToriiOnly={false}
          adsScopeLabel="Campañas de Meta Ads de este cliente"
          landingScopeLabel="Landings de este cliente (vsl_events.client_id)"
        />
      ) : null}

      {moreHref && (
        <Link
          to={moreHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Ver métricas completas por landing/campaña <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
