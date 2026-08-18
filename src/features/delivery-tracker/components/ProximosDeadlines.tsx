import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RoadmapProcess } from '@/features/roadmap/types';

interface Props {
  processes: RoadmapProcess[];
}

// Top 3-4 procesos no completados con fecha_fin, ordenados ascendente —
// los sin fecha_fin no tienen de qué "próximo" hablar, quedan afuera.
export function ProximosDeadlines({ processes }: Props) {
  const today = startOfToday();
  const upcoming = processes
    .filter((p) => p.status !== 'completado' && p.fecha_fin)
    .sort((a, b) => (a.fecha_fin as string).localeCompare(b.fecha_fin as string))
    .slice(0, 4);

  return (
    <Card className="bg-card border-border/50 rounded-2xl h-full">
      <CardContent className="p-[18px] space-y-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">
          <Calendar className="h-3.5 w-3.5" />
          Próximos deadlines
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">Sin deadlines próximos.</p>
        ) : (
          <div className="space-y-3.5">
            {upcoming.map((p) => {
              const overdue = isBefore(parseISO(p.fecha_fin as string), today);
              return (
                <div key={p.id} className="flex items-start gap-2.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0', overdue || p.status === 'bloqueado' ? 'bg-destructive' : 'bg-warning')} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground/90 leading-snug">{p.nombre}</p>
                    <p className={cn('text-[11px] mt-0.5', overdue ? 'text-destructive font-semibold' : 'text-muted-foreground/70')}>
                      {format(parseISO(p.fecha_fin as string), "d MMM", { locale: es })}
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/15 px-1.5 py-0.5 rounded ml-1.5">
                          ⚠ VENCIDO
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
