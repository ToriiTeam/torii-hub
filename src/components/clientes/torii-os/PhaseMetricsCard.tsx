import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPhaseMetrics, metricsVisibleForPhase, type PhaseMetrics } from '@/features/delivery-os/lib/phaseMetrics';
import { safeDiv } from '@/features/executive-dashboard/lib/clientHealth';
import type { PhaseKey } from '@/features/delivery-os/types';

interface Props {
  clientId: string;
  fase: PhaseKey;
  since: string; // phase.fecha_inicio
}

function fmtMoney(v: number | null): string {
  return v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function PhaseMetricsCard({ clientId, fase, since }: Props) {
  const [metrics, setMetrics] = useState<PhaseMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPhaseMetrics(clientId, since)
      .then((m) => { if (!cancelled) setMetrics(m); })
      .catch((err) => console.error('[PhaseMetricsCard] failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, since]);

  const visible = metricsVisibleForPhase(fase);
  const nothingVisible = !Object.values(visible).some(Boolean);
  if (nothingVisible) return null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-medium">Métricas de la fase</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !metrics ? (
          <p className="text-sm text-muted-foreground text-center py-6">Cargando…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {visible.cpbc && <Metric label="CPBC" value={fmtMoney(metrics.cpbc)} />}
            {visible.leads && <Metric label="Leads" value={metrics.ads.leads} />}
            {visible.ctr && <Metric label="CTR" value={metrics.ads.ctr != null ? `${metrics.ads.ctr.toFixed(2)}%` : '—'} />}
            {visible.showRate && <Metric label="Show rate" value={fmtPct(metrics.closing.showRate)} />}
            {visible.qualRate && <Metric label="Tasa calificación" value={fmtPct(safeDiv(metrics.closing.calificados, metrics.closing.reuniones))} />}
            {visible.cierres && <Metric label="Cierres" value={metrics.closing.cierres} />}
            {visible.closeRate && <Metric label="Tasa cierre" value={fmtPct(metrics.closing.closeRate)} />}
            {visible.revenue && <Metric label="Revenue" value="Sin datos" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
