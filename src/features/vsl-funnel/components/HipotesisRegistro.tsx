import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Hipotesis } from '@/features/delivery-tracker/lib/deliveryOsRepo';

const ESTADO_COLOR: Record<Hipotesis['estado'], string> = {
  validado: 'text-success',
  testeando: 'text-warning',
  matado: 'text-destructive',
  a_iterar: 'text-muted-foreground',
};

interface Props {
  hipotesis: Hipotesis[];
}

// Misma data que el kanban, sin filtro nuevo — solo lectura, en formato
// lista cronológica (ya viene ordenada fecha desc desde fetchHipotesis).
export function HipotesisRegistro({ hipotesis }: Props) {
  if (hipotesis.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        Todavía no hay hipótesis cargadas para este cliente.
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[70px_1.6fr_100px_100px_90px_1fr] gap-2.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 bg-secondary/30">
          <span>Fecha</span><span>Hipótesis</span><span>Métrica</span><span>Dueño</span><span>Estado</span><span>Resultado</span>
        </div>
        {hipotesis.map((h) => (
          <div key={h.id} className="grid grid-cols-[70px_1.6fr_100px_100px_90px_1fr] gap-2.5 px-4 py-2.5 text-sm border-t border-border/40 items-center">
            <span className="text-[11px] text-muted-foreground/70">{format(parseISO(h.fecha), 'd MMM', { locale: es })}</span>
            <span className="truncate">{h.texto}</span>
            <span className="text-xs text-muted-foreground/70 truncate">{h.metrica || '—'}</span>
            <span className="text-xs text-muted-foreground/70 truncate">{h.responsable || '—'}</span>
            <span className={cn('text-xs font-semibold capitalize', ESTADO_COLOR[h.estado])}>{h.estado.replace('_', ' ')}</span>
            <span className="text-xs text-muted-foreground/70 truncate">{h.resultado || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
