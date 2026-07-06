import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { fetchChecklist } from '@/features/delivery-os/lib/phasesRepo';
import { PHASE_LABELS } from '@/features/delivery-os/types';
import type { DeliveryPhase, PhaseChecklistItem } from '@/features/delivery-os/types';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

interface Props {
  phase: DeliveryPhase | null;
  onClose: () => void;
}

export function PhaseHistoryDialog({ phase, onClose }: Props) {
  const [checklist, setChecklist] = useState<PhaseChecklistItem[]>([]);

  useEffect(() => {
    if (!phase) { setChecklist([]); return; }
    fetchChecklist(phase.client_id, phase.fase).then(setChecklist).catch(console.error);
  }, [phase]);

  if (!phase) return null;
  const days = phase.fecha_fin ? differenceInCalendarDays(parseISO(phase.fecha_fin), parseISO(phase.fecha_inicio)) : null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>{PHASE_LABELS[phase.fase]}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Del {fmtDate(phase.fecha_inicio)} al {fmtDate(phase.fecha_fin)}
            {days != null && ` — ${days} días (objetivo: ${phase.tiempo_objetivo_dias ?? '—'})`}
          </p>
          <div className="space-y-1.5">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox checked={item.completada} disabled />
                <span className={item.completada ? 'line-through text-muted-foreground' : ''}>{item.tarea}</span>
              </div>
            ))}
            {checklist.length === 0 && <p className="text-muted-foreground">Sin checklist registrado para esta fase</p>}
          </div>
          {phase.notas && <p className="text-muted-foreground border-t border-border/30 pt-2">{phase.notas}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
