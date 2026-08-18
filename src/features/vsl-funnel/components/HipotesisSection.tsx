import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchHipotesis, type Hipotesis } from '@/features/delivery-tracker/lib/deliveryOsRepo';
import { HipotesisKanban } from './HipotesisKanban';
import { HipotesisRegistro } from './HipotesisRegistro';
import { Cuaderno } from './Cuaderno';

type View = 'kanban' | 'registro' | 'cuaderno';

const VIEWS: { value: View; label: string }[] = [
  { value: 'kanban', label: 'Kanban' },
  { value: 'registro', label: 'Registro' },
  { value: 'cuaderno', label: 'Cuaderno' },
];

interface Props {
  clientId: string;
}

// Toggle simple con botones en vez de un 4to nivel de Tabs anidado — acá ya
// estamos en Delivery OS > VSL Funnel > Hipótesis, un Tabs más se siente
// pesado.
export function HipotesisSection({ clientId }: Props) {
  const [view, setView] = useState<View>('kanban');
  const [hipotesis, setHipotesis] = useState<Hipotesis[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHipotesis(await fetchHipotesis(clientId));
    } catch (err) {
      console.error('[HipotesisSection] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
        {VIEWS.map((v) => (
          <Button
            key={v.value}
            size="sm"
            variant="ghost"
            className={cn(
              'h-7 px-3 text-xs',
              view === v.value && 'bg-background shadow-sm',
            )}
            onClick={() => setView(v.value)}
          >
            {v.label}
          </Button>
        ))}
      </div>

      {view === 'cuaderno' ? (
        <Cuaderno clientId={clientId} />
      ) : loading ? (
        <div className="h-40 rounded-lg bg-secondary/40 animate-pulse" />
      ) : view === 'kanban' ? (
        <HipotesisKanban hipotesis={hipotesis} onChanged={load} />
      ) : (
        <HipotesisRegistro hipotesis={hipotesis} />
      )}
    </div>
  );
}
