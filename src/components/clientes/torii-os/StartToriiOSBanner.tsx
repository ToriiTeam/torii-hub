import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { startToriiOS } from '@/features/delivery-os/lib/phasesRepo';

interface Props {
  clientId: string;
  onStarted: () => void;
}

export function StartToriiOSBanner({ clientId, onStarted }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      await startToriiOS(clientId);
      toast.success('Torii OS iniciado — fase de Onboarding');
      onStarted();
    } catch (err) {
      console.error(err);
      toast.error('Error al iniciar Torii OS');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-10 flex flex-col items-center text-center gap-4">
        <Rocket className="h-10 w-10 text-primary" />
        <div>
          <p className="font-semibold">Este cliente todavía no tiene el Torii OS iniciado</p>
          <p className="text-sm text-muted-foreground mt-1">Arranca el sistema de fases de delivery, empezando por Onboarding.</p>
        </div>
        <Button onClick={handleStart} disabled={loading}>
          {loading ? 'Iniciando…' : 'Iniciar Torii OS'}
        </Button>
      </CardContent>
    </Card>
  );
}
