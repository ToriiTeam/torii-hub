import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchVslMetricsSummary, type VslMetricsSummary } from '@/features/vsl-funnel/lib/fetchVslMetricsSummary';

interface Props {
  landingId: string; // tracked_landings.landing_id (no el uuid de la fila)
}

// Solo se renderiza cuando el VSL entry tiene un tracked_landing_id
// seteado — si no, no hay landing_id real con el que consultar vsl_events,
// y VslEntryCard directamente no monta este componente.
export function VslMetricasResumen({ landingId }: Props) {
  const [summary, setSummary] = useState<VslMetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVslMetricsSummary(landingId)
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch((err) => console.error('[VslMetricasResumen] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [landingId]);

  if (loading) return <div className="h-16 rounded-lg bg-secondary/40 animate-pulse" />;
  if (!summary) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3.5 flex items-center gap-4 flex-wrap">
      <Stat label="Sesiones (30d)" value={summary.sessions.toLocaleString()} />
      <Stat label="Tasa de play" value={`${summary.playRate}%`} />
      <Stat label="Conversión" value={`${summary.conversionRate}%`} />
      <Link
        to={`/torii/vsl-tracking?landing=${encodeURIComponent(landingId)}`}
        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        Ver métricas completas <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
