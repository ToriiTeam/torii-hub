import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { ToriiView } from '@/features/executive-dashboard/components/ToriiView';
import { VslFunnelView } from '@/features/executive-dashboard/components/VslFunnelView';
import { PeriodSelector } from '@/features/executive-dashboard/components/shared/PeriodSelector';
import { fetchToriiData } from '@/features/executive-dashboard/lib/fetchToriiData';
import { fetchVslFunnelData } from '@/features/executive-dashboard/lib/fetchVslFunnel';
import { MetaSyncAlertBanner } from '@/features/meta-ads/components/common/MetaSyncAlertBanner';
import { getPeriodRange, periodSuffixLabel, clampToNuevoTorii, type PeriodType, type PresetKey } from '@/features/executive-dashboard/lib/periodRange';
import type { ToriiData } from '@/features/executive-dashboard/types';
import type { VslFunnelData } from '@/features/executive-dashboard/lib/fetchVslFunnel';

function navMonth(year: number, month: number, dir: 'prev' | 'next'): { year: number; month: number } {
  if (dir === 'prev') return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default function ExecutiveDashboard() {
  const now = new Date();
  // Solo vista Torii — el toggle "Todos los clientes" (agregado que
  // mezclaba clientes reales) se sacó por completo: rompe el principio de
  // subcuentas aisladas que ya aplica el resto del proyecto (es_interno,
  // get_scorecard_salud/get_situacion_clientes filtrados por cliente, etc.).
  // El dashboard de un cliente puntual vive en TabDashboardCliente.tsx
  // (dentro de la ficha de cada cliente, ClienteDetalle.tsx), que reusa
  // ClientView/fetchClientData por su cuenta. No se borran esos 2 archivos:
  // fetchClientData.ts también alimenta phaseMetrics.ts y MetricasClave.tsx,
  // ninguno relacionado con este dashboard.
  const [periodType, setPeriodType] = useState<PeriodType>('preset');
  const [preset, setPreset] = useState<PresetKey>('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [customSince, setCustomSince] = useState(() => now.toISOString().slice(0, 10));
  const [customUntil, setCustomUntil] = useState(() => now.toISOString().slice(0, 10));

  // "Nuevo Torii" toggle — independent of the period selector. When ON, the
  // effective (since, until) fed to EVERY query in fetchToriiData.ts
  // (ads_metricas_diarias, client_closer_calls, incomes, expenses, clients)
  // is clamped to NUEVO_TORII_SINCE (2026-06-01) — a single mechanism, no
  // per-card exceptions, no client/oferta/fuente filtering. Earlier
  // iterations tried categorical filters and a second funnel-specific date
  // floor; both were explicitly reverted back to this single clamp. Only
  // relevant to the Torii view, but declared here (not ToriiView-local
  // state) since it lives in the shared header next to the period
  // selector, same pattern as selectedClient/period state.
  const [nuevoToriiOnly, setNuevoToriiOnly] = useState(true);

  const [loading, setLoading] = useState(true);
  const [toriiData, setToriiData] = useState<ToriiData | null>(null);
  const [vslFunnelData, setVslFunnelData] = useState<VslFunnelData | null>(null);
  const [toriiTab, setToriiTab] = useState<'resumen' | 'funnel'>('resumen');

  const range = getPeriodRange({ periodType, preset, year, month, customSince, customUntil });
  const toriiRange = nuevoToriiOnly ? { ...range, ...clampToNuevoTorii(range.since, range.until) } : range;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchToriiData(toriiRange.since, toriiRange.until, nuevoToriiOnly),
      fetchVslFunnelData(toriiRange.since, toriiRange.until),
    ])
      .then(([data, funnel]) => { if (!cancelled) { setToriiData(data); setVslFunnelData(funnel); } })
      .catch((err) => console.error('[ExecutiveDashboard] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, preset, year, month, customSince, customUntil, nuevoToriiOnly]);

  return (
    <div className="space-y-6 animate-fade-in">
      <MetaSyncAlertBanner />
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-sm text-muted-foreground">Vista consolidada de ads, closing, revenue y VSL de Torii</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 h-9">
          <Label htmlFor="nuevo-torii-toggle" className="text-sm cursor-pointer">
            {nuevoToriiOnly ? 'Nuevo Torii' : 'Viejo Torii'}
          </Label>
          <Switch id="nuevo-torii-toggle" checked={nuevoToriiOnly} onCheckedChange={setNuevoToriiOnly} />
          <UiTooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Recalcula TODAS las cards de esta vista usando solo datos desde el 01/06/2026 en adelante — un único piso de fecha, sin excepciones por card. Se combina con el período seleccionado arriba (se usa el más restrictivo de los dos).
            </TooltipContent>
          </UiTooltip>
        </div>
      </div>

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

      {!loading && (
        <Tabs value={toriiTab} onValueChange={(v) => setToriiTab(v as 'resumen' | 'funnel')}>
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="funnel">VSL Funnel</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : toriiTab === 'resumen' ? (
        toriiData && (
          <ToriiView
            data={toriiData}
            periodSuffix={periodSuffixLabel({ periodType, preset })}
            periodStart={toriiRange.since}
            periodEnd={toriiRange.until}
            nuevoToriiOnly={nuevoToriiOnly}
          />
        )
      ) : (
        toriiData && vslFunnelData && (
          <VslFunnelView metrics={toriiData} vslFunnelData={vslFunnelData} nuevoToriiOnly={nuevoToriiOnly} />
        )
      )}
    </div>
  );
}
