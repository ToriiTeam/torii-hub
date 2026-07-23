import { Card, CardContent } from '@/components/ui/card';
import { MetricInfo, type MetricInfoProps } from './shared/MetricInfo';
import { calcCostoPorLlamadaCalificada } from '../lib/businessHealth';
import type { VslFunnelMetrics } from '../types';
import type { VslFunnelData } from '../lib/fetchVslFunnel';

function fmtMoney(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}
// For sub-dollar figures (CPC, CPM) — Math.round collapses $0.25 to $0.
function fmtMoney2(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtN(v: number): string {
  return v.toLocaleString();
}
function fmtPct1(v: number | null): string {
  return v == null ? '—' : `${v.toFixed(1)}%`;
}
function fmtPct(numerator: number, denominator: number): string {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : '—';
}

function MiniKpi({ label, value, sub, info }: { label: string; value: string; sub?: string; info: MetricInfoProps }) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <MetricInfo {...info} />
        </div>
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface VslFunnelViewProps {
  metrics: VslFunnelMetrics;
  vslFunnelData: VslFunnelData;
  nuevoToriiOnly: boolean;
}

const LANDING_SCOPE = "landing_id = 'torii-principal'";

export function VslFunnelView({ metrics, vslFunnelData, nuevoToriiOnly }: VslFunnelViewProps) {
  const { ads, closing } = metrics;
  const v = vslFunnelData;

  const adsScope = nuevoToriiOnly
    ? "Piso 'Nuevo Torii': 2026-06-01 en adelante"
    : 'Sin filtro adicional — usa el período seleccionado arriba';

  const cpbc = calcCostoPorLlamadaCalificada(ads.inversion, metrics.qualifiedAdsCalls);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MiniKpi
        label="Inversión" value={fmtMoney(ads.inversion)}
        info={{ formula: 'Gasto total en Meta Ads de las cuentas propias de Torii.', source: 'ads_metricas_diarias', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="CPBC" value={cpbc != null ? fmtMoney(cpbc) : '—'}
        info={{
          formula: "Inversión en ads / cantidad de client_closer_calls donde owner_type='torii', fuente='ADS', se_presento=true y califico=true.",
          source: 'ads_metricas_diarias + client_closer_calls', scopeLabel: adsScope,
        }}
      />
      <MiniKpi
        label="Impresiones" value={fmtN(ads.impresiones)}
        info={{ formula: 'Impresiones de Meta Ads para las cuentas propias de Torii.', source: 'ads_metricas_diarias', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="Clicks" value={fmtN(ads.clics)}
        info={{ formula: 'Link clicks (al enlace, no clics totales).', source: 'ads_metricas_diarias', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="CPC" value={ads.cpc != null ? fmtMoney2(ads.cpc) : '—'}
        info={{ formula: 'Costo por clic, promedio diario reportado por Meta.', source: 'ads_metricas_diarias', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="CTR" value={fmtPct1(ads.ctr)}
        info={{ formula: 'Click-through rate, promedio diario reportado por Meta.', source: 'ads_metricas_diarias', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="CPM" value={ads.cpm != null ? fmtMoney2(ads.cpm) : '—'}
        info={{ formula: 'Costo por mil impresiones, promedio diario reportado por Meta.', source: 'ads_metricas_diarias', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="Plays" value={fmtN(v.plays)}
        info={{ formula: 'Sesiones con al menos un evento VSL_Play.', source: 'vsl_events', scopeLabel: LANDING_SCOPE }}
      />

      {/* Video %: acumulativo — cada uno incluye a quienes llegaron hasta ahí o más lejos */}
      <MiniKpi
        label="25%+" value={fmtPct(v.p25, v.plays)} sub={`${fmtN(v.p25)} sesiones · acumulativo`}
        info={{ formula: '% de sesiones con Play que alcanzaron 25% o más (acumulativo, no exclusivo por etapa).', source: 'vsl_events', scopeLabel: LANDING_SCOPE }}
      />
      <MiniKpi
        label="50%+" value={fmtPct(v.p50, v.plays)} sub={`${fmtN(v.p50)} sesiones · acumulativo`}
        info={{ formula: '% de sesiones con Play que alcanzaron 50% o más (acumulativo, no exclusivo por etapa).', source: 'vsl_events', scopeLabel: LANDING_SCOPE }}
      />
      <MiniKpi
        label="75%+" value={fmtPct(v.p75, v.plays)} sub={`${fmtN(v.p75)} sesiones · acumulativo`}
        info={{ formula: '% de sesiones con Play que alcanzaron 75% o más (acumulativo, no exclusivo por etapa).', source: 'vsl_events', scopeLabel: LANDING_SCOPE }}
      />
      <MiniKpi
        label="100%" value={fmtPct(v.p100, v.plays)} sub={`${fmtN(v.p100)} sesiones`}
        info={{ formula: '% de sesiones con Play que completaron el video.', source: 'vsl_events', scopeLabel: LANDING_SCOPE }}
      />

      <MiniKpi
        label="Agendas" value={fmtN(closing.reuniones)}
        info={{ formula: "Total de filas en client_closer_calls (owner_type='torii') — una fila existe apenas se agenda la llamada en GHL, independiente de si después se_presento fue true o false.", source: 'client_closer_calls', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="Llamadas efectivas" value={fmtN(closing.asistieron)}
        info={{ formula: "client_closer_calls donde se_presento=true.", source: 'client_closer_calls', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="Cierres" value={fmtN(closing.cierres)}
        info={{ formula: 'client_closer_calls donde cerro=true.', source: 'client_closer_calls', scopeLabel: adsScope }}
      />
      <MiniKpi
        label="No cierres" value={fmtN(closing.noCierres)}
        info={{ formula: 'client_closer_calls donde se_presento=true AND cerro=false.', source: 'client_closer_calls', scopeLabel: adsScope }}
      />
    </div>
  );
}
