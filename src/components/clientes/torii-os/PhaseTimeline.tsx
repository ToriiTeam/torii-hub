import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASE_LABELS, PHASE_ORDER } from '@/features/delivery-os/types';
import type { DeliveryPhase } from '@/features/delivery-os/types';

interface Props {
  current: DeliveryPhase | null;
  history: DeliveryPhase[];
  onSelectHistoryPhase: (phase: DeliveryPhase) => void;
  compact?: boolean;
}

export function PhaseTimeline({ current, history, onSelectHistoryPhase, compact = false }: Props) {
  // A phase can only appear once per client in practice, but if the client
  // ever repeats a phase (e.g. sent back), take the most recent completed
  // record for the click-to-see-history lookup.
  const historyByPhase = new Map(history.map((h) => [h.fase, h]));
  const currentIndex = current ? PHASE_ORDER.indexOf(current.fase) : -1;

  const track = (
    <div className={cn('flex items-start min-w-max', compact ? 'px-0' : 'px-2')}>
      {PHASE_ORDER.map((key, i) => {
        const historyRecord = historyByPhase.get(key);
        const isCompleted = !!historyRecord;
        const isCurrent = current?.fase === key;
        const isFuture = !isCompleted && !isCurrent;
        // Connector segment that follows this phase: green once this
        // phase is done, red while this phase is the active one, gray
        // for anything still ahead of the current phase.
        const connectorClass = isCompleted
          ? 'bg-success'
          : isCurrent
            ? 'bg-destructive'
            : 'bg-border';

        return (
          <div key={key} className="flex items-start">
            <div className={cn('flex flex-col items-center flex-shrink-0', compact ? 'w-8' : 'w-24')}>
              <button
                type="button"
                disabled={!isCompleted}
                onClick={() => historyRecord && onSelectHistoryPhase(historyRecord)}
                title={PHASE_LABELS[key]}
                className={cn(
                  'relative flex items-center justify-center rounded-full font-bold transition-transform shrink-0',
                  compact
                    ? (isCurrent ? 'h-7 w-7 text-[11px]' : 'h-5 w-5 text-[10px]')
                    : (isCurrent ? 'h-14 w-14 text-base scale-105' : 'h-10 w-10 text-sm'),
                  isCompleted && 'bg-success text-success-foreground hover:scale-110 cursor-pointer',
                  isCurrent && 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/40',
                  isFuture && 'bg-secondary text-muted-foreground border-2 border-border cursor-default',
                )}
              >
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-60" />
                )}
                <span className="relative z-10">
                  {isCompleted ? <Check className={compact ? 'h-3 w-3' : 'h-5 w-5'} /> : (compact ? null : i + 1)}
                </span>
              </button>

              {isCurrent && (
                <Badge className={cn('bg-destructive text-destructive-foreground border-0 px-1.5 py-0', compact ? 'mt-1 text-[8px]' : 'mt-1.5 text-[10px]')}>
                  ACTUAL
                </Badge>
              )}

              {!compact && (
                <span
                  title={PHASE_LABELS[key]}
                  className={cn(
                    'mt-1.5 text-[11px] text-center leading-tight truncate max-w-[92px]',
                    isCurrent && 'font-bold text-foreground',
                    isCompleted && 'text-success font-medium',
                    isFuture && 'text-muted-foreground',
                  )}
                >
                  {PHASE_LABELS[key]}
                </span>
              )}
            </div>

            {i < PHASE_ORDER.length - 1 && (
              <div className={cn('rounded-full shrink-0', compact ? 'h-0.5 w-4 mt-2.5' : 'h-1 w-8 mt-5', connectorClass)} />
            )}
          </div>
        );
      })}
    </div>
  );

  if (compact) return track;

  return (
    <Card className="bg-card border-2 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide">
          Torii OS · Fase de Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-6 overflow-x-auto">
        {track}
        {currentIndex >= 0 && (
          <p className="text-xs text-muted-foreground mt-1 px-2">
            Fase {currentIndex + 1} de {PHASE_ORDER.length}: <span className="text-foreground font-medium">{PHASE_LABELS[current!.fase]}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
