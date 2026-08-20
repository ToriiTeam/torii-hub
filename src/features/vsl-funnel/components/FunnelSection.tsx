import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  fetchVslFunnelForClient,
  type VslClientFunnel,
} from '@/features/vsl-funnel/lib/fetchVslMetricsSummary';

interface Props {
  clientId: string;
  // A dónde manda "Ver métricas completas" — /torii/vsl-tracking (global,
  // sin filtrar) por default; TabVSLFunnel.tsx pasa la ruta scopeada al
  // cliente activo (/c/:id/vsl) cuando corresponde, ver punto B/C.
  moreHref?: string;
}

// Sub-subsección "Funnel" del VSL Funnel — vista agregada de las métricas
// de vsl_events de TODAS las landings del cliente (via tracked_landings),
// reusando fetchVslFunnelForClient (misma semántica de eventos que
// VslTracking.tsx / VslMetricasResumen). Se monta igual para un cliente
// real y para el casillero interno de Torii — mismo componente
// TabVSLFunnel.tsx para ambos.
export function FunnelSection({ clientId, moreHref = '/torii/vsl-tracking' }: Props) {
  const [funnel, setFunnel] = useState<VslClientFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVslFunnelForClient(clientId)
      .then((f) => { if (!cancelled) setFunnel(f); })
      .catch((err) => {
        console.error('[FunnelSection] load failed:', err);
        if (!cancelled) setError('No se pudo cargar el funnel.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
        <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-dashed border-destructive/40 p-8 text-center text-sm text-destructive">{error}</div>;
  }

  if (!funnel || funnel.landingCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 p-12 text-center text-muted-foreground text-sm">
        Sin tráfico registrado en los últimos {funnel?.windowDays ?? 30} días. El funnel se completa a medida que
        vsl_events recibe sesiones de las landings de este cliente.
      </div>
    );
  }

  const maxCount = funnel.stages[0]?.count ?? 0;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Funnel de conversión</CardTitle>
          <CardDescription>
            Últimos {funnel.windowDays} días · {funnel.landingCount} landing{funnel.landingCount === 1 ? '' : 's'} con tráfico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.stages.map((stage) => {
            const widthPct = maxCount ? Math.max(4, Math.round((stage.count / maxCount) * 100)) : 0;
            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted-foreground">
                    {stage.count.toLocaleString()} <span className="text-xs">({stage.pctOfVisitors}%)</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Link
        to={moreHref}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        Ver métricas completas por landing/campaña <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
