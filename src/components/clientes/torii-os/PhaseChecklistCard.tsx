import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { toggleChecklistItem } from '@/features/delivery-os/lib/phasesRepo';
import { PHASE_LABELS } from '@/features/delivery-os/types';
import type { PhaseChecklistItem, PhaseKey } from '@/features/delivery-os/types';

interface Props {
  fase: PhaseKey;
  items: PhaseChecklistItem[];
  onChange: () => void;
}

export function PhaseChecklistCard({ fase, items, onChange }: Props) {
  const completedCount = items.filter((i) => i.completada).length;
  const progress = items.length ? (completedCount / items.length) * 100 : 0;
  const allDone = items.length > 0 && completedCount === items.length;

  async function handleToggle(item: PhaseChecklistItem, checked: boolean) {
    try {
      await toggleChecklistItem(item, checked);
      onChange();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la tarea');
    }
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-medium">Checklist — {PHASE_LABELS[fase]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} de {items.length} tareas completadas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                id={item.id}
                checked={item.completada}
                onCheckedChange={(v) => handleToggle(item, !!v)}
              />
              <Label htmlFor={item.id} className={cn('text-sm cursor-pointer', item.completada && 'line-through text-muted-foreground')}>
                {item.tarea}
              </Label>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin checklist para esta fase</p>}
        </div>

        {allDone && (
          <div className="bg-success/10 border border-success/30 rounded-md p-3 text-sm text-success font-medium">
            ¡Fase completada! Podés avanzar a la siguiente fase.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
