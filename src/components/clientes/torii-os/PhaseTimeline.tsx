import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PHASE_LABELS, PHASE_ORDER } from '@/features/delivery-os/types';
import type { DeliveryPhase } from '@/features/delivery-os/types';

interface Props {
  current: DeliveryPhase | null;
  history: DeliveryPhase[];
  onSelectHistoryPhase: (phase: DeliveryPhase) => void;
}

export function PhaseTimeline({ current, history, onSelectHistoryPhase }: Props) {
  // A phase can only appear once per client in practice, but if the client
  // ever repeats a phase (e.g. sent back), take the most recent completed
  // record for the click-to-see-history lookup.
  const historyByPhase = new Map(history.map((h) => [h.fase, h]));

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {PHASE_ORDER.map((key, i) => {
            const historyRecord = historyByPhase.get(key);
            const isCompleted = !!historyRecord;
            const isCurrent = current?.fase === key;
            return (
              <div key={key} className="flex items-center">
                <button
                  type="button"
                  disabled={!isCompleted}
                  onClick={() => historyRecord && onSelectHistoryPhase(historyRecord)}
                  className={cn(
                    'px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                    isCompleted && 'bg-success/20 text-success hover:bg-success/30 cursor-pointer',
                    isCurrent && 'bg-primary text-primary-foreground',
                    !isCompleted && !isCurrent && 'bg-secondary text-muted-foreground cursor-default',
                  )}
                >
                  {PHASE_LABELS[key]}
                </button>
                {i < PHASE_ORDER.length - 1 && <div className="w-4 h-px bg-border shrink-0" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
