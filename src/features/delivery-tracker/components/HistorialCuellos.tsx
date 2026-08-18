import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CuelloBotella } from '@/features/delivery-tracker/lib/deliveryOsRepo';

interface Props {
  cuellos: CuelloBotella[];
}

// estado != 'activo' (resuelto o descartado), más reciente primero.
export function HistorialCuellos({ cuellos }: Props) {
  const resueltos = cuellos
    .filter((c) => c.estado !== 'activo')
    .sort((a, b) => (b.fecha_resolucion ?? '').localeCompare(a.fecha_resolucion ?? ''));

  if (resueltos.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70 mb-3">
        🕓 Historial de cuellos de botella
      </div>
      <div className="space-y-2">
        {resueltos.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 bg-secondary/30 border border-border/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[11px] text-muted-foreground/70 flex-shrink-0">
                {c.fecha_resolucion ? format(parseISO(c.fecha_resolucion), 'd MMM', { locale: es }) : '—'}
              </span>
              <span className="text-sm text-foreground/90 truncate">{c.motivo}</span>
            </div>
            <span className={cn(
              'text-xs font-semibold flex-shrink-0',
              c.estado === 'resuelto' ? 'text-success' : 'text-muted-foreground/70',
            )}>
              {c.resultado || (c.estado === 'descartado' ? 'Descartado' : 'Resuelto')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
