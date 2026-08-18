import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { MOTIVO_GRUPOS, findMotivo } from '@/features/delivery-tracker/lib/motivos';
import { applyBottleneckPlan } from '@/features/delivery-tracker/lib/deliveryOsRepo';

interface Props {
  clientId: string;
  currentPhaseId: string | null;
  onApplied: () => void;
}

export function CuelloBotellaActivo({ clientId, currentPhaseId, onApplied }: Props) {
  const [motivoKey, setMotivoKey] = useState('');
  const [applying, setApplying] = useState(false);

  const selected = motivoKey ? findMotivo(motivoKey) : undefined;

  async function handleApply() {
    if (!motivoKey) return;
    setApplying(true);
    try {
      await applyBottleneckPlan(clientId, motivoKey, currentPhaseId);
      toast.success('Plan aplicado al Roadmap');
      setMotivoKey('');
      onApplied();
    } catch (err) {
      console.error('[CuelloBotellaActivo] apply failed:', err);
      toast.error('Error al aplicar el plan');
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-destructive/10 to-card border-destructive/30 rounded-2xl">
      <div className="absolute left-0 top-[22px] bottom-[22px] w-1 rounded bg-destructive" />
      <CardContent className="p-[22px] pl-[26px] space-y-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-destructive">
          <Zap className="h-3.5 w-3.5" />
          Cuello de botella activo
        </div>
        <p className="text-sm text-muted-foreground">
          ¿Qué está pasando con este cliente ahora mismo? Elegí el motivo — el plan de contingencia se sugiere solo.
        </p>

        <Select value={motivoKey} onValueChange={setMotivoKey}>
          <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar motivo…" /></SelectTrigger>
          <SelectContent>
            {MOTIVO_GRUPOS.map((grupo) => (
              <SelectGroup key={grupo.categoria}>
                <SelectLabel>{grupo.categoria}</SelectLabel>
                {grupo.items.map((item) => (
                  <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <div className="flex gap-2.5 bg-white/[0.03] rounded-lg p-3.5">
            <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-success mb-0.5">Plan de contingencia sugerido</p>
              <p className="text-sm text-muted-foreground">{selected.item.planContingencia}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleApply}
          disabled={!motivoKey || applying}
          className="bg-destructive hover:bg-destructive/90 disabled:opacity-40"
        >
          {applying ? 'Aplicando…' : <>Aplicar al Roadmap <ArrowRight className="h-4 w-4 ml-1.5" /></>}
        </Button>
      </CardContent>
    </Card>
  );
}
