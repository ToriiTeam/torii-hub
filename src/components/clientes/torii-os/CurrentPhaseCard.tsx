import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { advanceToNextPhase, nextPhaseOf } from '@/features/delivery-os/lib/phasesRepo';
import { PHASE_DEFAULT_DAYS, PHASE_LABELS, PHASE_OBJECTIVES } from '@/features/delivery-os/types';
import type { DeliveryPhase } from '@/features/delivery-os/types';

interface Props {
  phase: DeliveryPhase;
  clientId: string;
  onAdvanced: () => void;
  onRegisterBottleneck: () => void;
}

export function CurrentPhaseCard({ phase, clientId, onAdvanced, onRegisterBottleneck }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const daysInPhase = differenceInCalendarDays(new Date(), parseISO(phase.fecha_inicio));
  const objetivo = phase.tiempo_objetivo_dias ?? PHASE_DEFAULT_DAYS[phase.fase];
  const ratio = objetivo > 0 ? daysInPhase / objetivo : 0;
  const semaphoreClass = ratio > 1 ? 'text-destructive' : ratio >= 0.8 ? 'text-warning' : 'text-success';
  const next = nextPhaseOf(phase.fase);

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await advanceToNextPhase(clientId, phase);
      toast.success('Fase avanzada');
      setConfirmOpen(false);
      onAdvanced();
    } catch (err) {
      console.error(err);
      toast.error('Error al avanzar de fase');
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-medium">{PHASE_LABELS[phase.fase]}</CardTitle>
        <CardDescription>{PHASE_OBJECTIVES[phase.fase]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className={cn('text-2xl font-bold', semaphoreClass)}>{daysInPhase}</p>
          <p className="text-xs text-muted-foreground">días en fase (objetivo: {objetivo} días)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onRegisterBottleneck}>
            <AlertTriangle className="h-4 w-4 mr-1" />Registrar bottleneck
          </Button>
          {next && (
            <Button size="sm" onClick={() => setConfirmOpen(true)}>Avanzar a siguiente fase</Button>
          )}
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>¿Avanzar a la siguiente fase?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto cierra <strong>{PHASE_LABELS[phase.fase]}</strong> y arranca{' '}
            <strong>{next ? PHASE_LABELS[next] : ''}</strong>. No se puede deshacer fácilmente.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdvance} disabled={advancing}>
              {advancing ? 'Avanzando…' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
