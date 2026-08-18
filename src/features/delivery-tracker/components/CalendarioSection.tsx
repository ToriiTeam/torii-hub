import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, isToday, isBefore, parseISO, startOfToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { RoadmapProcess } from '@/features/roadmap/types';

interface Props {
  processes: RoadmapProcess[];
}

export function CalendarioSection({ processes }: Props) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = startOfToday();

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // lunes=0 en el grid del mockup — getDay() da domingo=0, se remapea.
  const leadingBlanks = (getDay(monthStart) + 6) % 7;

  const eventsByDay = new Map<number, { color: string; label: string }[]>();
  for (const p of processes) {
    if (!p.fecha_fin) continue;
    const d = parseISO(p.fecha_fin);
    if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth()) continue;
    const overdue = p.status !== 'completado' && isBefore(d, today);
    const color = overdue ? 'destructive' : p.status;
    const list = eventsByDay.get(d.getDate()) ?? [];
    list.push({ color, label: p.nombre });
    eventsByDay.set(d.getDate(), list);
  }

  return (
    <div>
      <h2 className="font-sans font-extrabold text-lg mb-4">Calendario</h2>
      <Card className="bg-card border-border/50 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-sans font-bold text-[15px] capitalize">{format(cursor, 'MMMM yyyy', { locale: es })}</span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCursor((c) => subMonths(c, 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCursor((c) => addMonths(c, 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="text-[10px] font-bold uppercase text-muted-foreground/60 text-center pb-1.5">{d}</div>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
            {days.map((day) => {
              const events = eventsByDay.get(day.getDate()) ?? [];
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-16 rounded-lg p-1.5 flex flex-col gap-1 bg-white/[0.02] border border-transparent',
                    isToday(day) && 'border-destructive bg-destructive/[0.06]',
                  )}
                >
                  <span className={cn('text-[11px] font-semibold text-muted-foreground/70', isToday(day) && 'text-destructive')}>
                    {day.getDate()}
                  </span>
                  {events.slice(0, 2).map((e, i) => {
                    const token = e.color === 'destructive' ? 'destructive' : e.color === 'en_curso' ? 'warning' : e.color === 'completado' ? 'success' : 'muted-foreground';
                    return (
                      <span
                        key={i}
                        title={e.label}
                        className="text-[9px] font-semibold rounded px-1 py-0.5 truncate"
                        style={{ background: `hsl(var(--${token}) / 0.18)`, color: `hsl(var(--${token}))` }}
                      >
                        {e.label}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <Legend color="destructive" label="Bloqueado" />
            <Legend color="warning" label="En curso" />
            <Legend color="success" label="Completado" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <i className="h-2 w-2 rounded-full inline-block" style={{ background: `hsl(var(--${color}))` }} />
      {label}
    </span>
  );
}
