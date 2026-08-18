import { useEffect, useState } from 'react';
import { fetchClientData } from '@/features/executive-dashboard/lib/fetchClientData';
import { getPeriodRange } from '@/features/executive-dashboard/lib/periodRange';
import { safeDiv } from '@/features/executive-dashboard/lib/clientHealth';
import { fetchCpbcCalificado } from '@/features/delivery-tracker/lib/deliveryOsRepo';
import type { ClientDetailData } from '@/features/executive-dashboard/types';
import { cn } from '@/lib/utils';

// Show Rate/Tasa Calificación/Close Rate reusan fetchClientData tal cual
// (mismo cálculo que ya ve el staff en Dashboard del cliente). El CPBC NO
// sale de ahí — fetchClientData.cpbc divide por TODAS las llamadas
// agendadas, no por calificadas; se recalcula acá con fetchCpbcCalificado
// (se_presento=true AND califico=true), la única definición confirmada
// como correcta. El mismo error de fetchClientData también aparece en
// otras pantallas (Dashboard Ejecutivo, Portfolio, Reportes, Torii OS) —
// fuera de alcance de este archivo, mapeado aparte.
const SHOW_RATE_TARGET = 0.60;
const CLOSE_RATE_TARGET = 0.25;

interface Props {
  clientId: string;
}

export function MetricasClave({ clientId }: Props) {
  const [data, setData] = useState<ClientDetailData | null>(null);
  const [cpbc, setCpbc] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const now = new Date();
    const range = getPeriodRange({
      periodType: 'preset', preset: 'all',
      year: now.getFullYear(), month: now.getMonth() + 1,
      customSince: now.toISOString().slice(0, 10), customUntil: now.toISOString().slice(0, 10),
    });
    fetchClientData(clientId, range.since, range.until, range.isShortPeriod)
      .then(async (d) => {
        if (cancelled) return;
        setData(d);
        const c = await fetchCpbcCalificado(clientId, d.ads.inversion, range.since, range.until);
        if (!cancelled) setCpbc(c);
      })
      .catch((err) => console.error('[MetricasClave] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const tasaCalificacion = data ? safeDiv(data.closing.calificados, data.closing.reuniones) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <MetricCard label="CPBC" value={cpbc != null ? `$${cpbc.toFixed(1)}` : '—'} />
      <MetricCard
        label="Show Rate"
        value={data?.closing.showRate != null ? `${Math.round(data.closing.showRate * 100)}%` : '—'}
        good={data?.closing.showRate != null ? data.closing.showRate >= SHOW_RATE_TARGET : undefined}
        objective={`obj. ${Math.round(SHOW_RATE_TARGET * 100)}%`}
      />
      <MetricCard
        label="Tasa Calificación"
        value={tasaCalificacion != null ? `${Math.round(tasaCalificacion * 100)}%` : '—'}
      />
      <MetricCard
        label="Close Rate"
        value={data?.closing.closeRate != null ? `${Math.round(data.closing.closeRate * 100)}%` : '—'}
        good={data?.closing.closeRate != null ? data.closing.closeRate >= CLOSE_RATE_TARGET : undefined}
        objective={`obj. ${Math.round(CLOSE_RATE_TARGET * 100)}%`}
      />
    </div>
  );
}

function MetricCard({ label, value, good, objective }: { label: string; value: string; good?: boolean; objective?: string }) {
  return (
    <div className="bg-secondary/30 border border-border/50 rounded-xl p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">{label}</p>
      <p className={cn(
        'font-sans font-extrabold text-[22px] leading-none',
        good === true && 'text-success',
        good === false && 'text-destructive',
      )}>
        {value}
        {objective && <span className="text-[10px] font-medium text-muted-foreground/70 ml-1.5">{objective}</span>}
      </p>
    </div>
  );
}
