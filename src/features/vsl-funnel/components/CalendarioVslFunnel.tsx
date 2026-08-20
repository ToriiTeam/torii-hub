import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarioSection } from '@/features/delivery-tracker/components/CalendarioSection';
import { fetchClientRoadmap } from '@/features/roadmap/lib/roadmapRepo';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '@/features/roadmap/types';
import type { RoadmapProcess, ProcessStatus } from '@/features/roadmap/types';

const ESTADO_FILTER_OPTIONS: { value: ProcessStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completado', label: 'Completado' },
];

interface Props {
  clientId: string;
}

// Reusa CalendarioSection.tsx (Delivery OS > Resumen) tal cual — misma
// grilla mensual, mismos datos (roadmap_processes de este cliente) — y le
// agrega debajo una lista de deadlines del mes visible + un filtro por
// estado, sin tocar el componente reusado.
export function CalendarioVslFunnel({ clientId }: Props) {
  const [processes, setProcesses] = useState<RoadmapProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor] = useState(() => new Date());
  const [estadoFilter, setEstadoFilter] = useState<ProcessStatus | 'todos'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { processes } = await fetchClientRoadmap(clientId);
      setProcesses(processes);
    } catch (err) {
      console.error('[CalendarioVslFunnel] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Deadlines "del mes visible" — como CalendarioSection maneja su propio
  // cursor de navegación internamente (no expuesto), esta lista usa el mes
  // actual en vez de seguir la navegación interna del calendario. Es una
  // limitación conocida: navegar el calendario no mueve esta lista.
  const deadlinesDelMes = useMemo(() => {
    return processes
      .filter((p) => {
        if (!p.fecha_fin) return false;
        const d = parseISO(p.fecha_fin);
        if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth()) return false;
        if (estadoFilter !== 'todos' && p.status !== estadoFilter) return false;
        return true;
      })
      .sort((a, b) => (a.fecha_fin as string).localeCompare(b.fecha_fin as string));
  }, [processes, cursor, estadoFilter]);

  if (loading) {
    return <div className="h-96 rounded-2xl bg-secondary/40 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <CalendarioSection processes={processes} onChanged={load} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sans font-extrabold text-lg">Deadlines del mes</h2>
          <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as ProcessStatus | 'todos')}>
            <SelectTrigger className="w-44 h-8 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADO_FILTER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {deadlinesDelMes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-lg">
            Sin deadlines para este filtro en {format(cursor, 'MMMM', { locale: es })}.
          </p>
        ) : (
          <div className="space-y-1.5">
            {deadlinesDelMes.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 bg-secondary/20 border border-border/40 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground/70 shrink-0 w-14">{format(parseISO(p.fecha_fin as string), 'd MMM', { locale: es })}</span>
                  <span className="text-sm truncate">{p.nombre}</span>
                </div>
                <Badge className={`border-0 text-[10px] shrink-0 ${STATUS_BADGE_CLASS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
