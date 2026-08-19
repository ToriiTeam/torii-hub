import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { updateHipotesisEstado, type Hipotesis } from '@/features/delivery-tracker/lib/deliveryOsRepo';

const COLUMNAS: { estado: Hipotesis['estado']; label: string }[] = [
  { estado: 'testeando', label: 'Testeando' },
  { estado: 'validado', label: 'Validado' },
  { estado: 'matado', label: 'Matado' },
  { estado: 'a_iterar', label: 'A iterar' },
];

interface Props {
  hipotesis: Hipotesis[];
  onChanged: () => void;
  onEdit: (h: Hipotesis) => void;
  onDelete: (h: Hipotesis) => void;
}

// Sin drag-and-drop — un select de estado en cada card alcanza y es mucho
// más simple de implementar sin bugs de reordenamiento/librería nueva.
export function HipotesisKanban({ hipotesis, onChanged, onEdit, onDelete }: Props) {
  async function handleMove(h: Hipotesis, estado: Hipotesis['estado']) {
    if (estado === h.estado) return;
    try {
      await updateHipotesisEstado(h.id, estado);
      onChanged();
    } catch (err) {
      console.error('[HipotesisKanban] move failed:', err);
      toast.error('Error al mover la hipótesis');
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNAS.map((col) => {
        const items = hipotesis.filter((h) => h.estado === col.estado);
        return (
          <div key={col.estado} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
              <span className="text-xs text-muted-foreground/60">{items.length}</span>
            </div>
            <div className="space-y-2 min-h-16">
              {items.map((h) => (
                <Card key={h.id} className="bg-card border-border/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm leading-snug line-clamp-4 flex-1">{h.texto}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1 -mt-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(h)} title="Editar">
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(h)} title="Eliminar">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {h.metrica && <p>Métrica: {h.metrica}</p>}
                      {h.responsable && <p>Dueño: {h.responsable}</p>}
                      <p>{format(parseISO(h.fecha), 'd MMM', { locale: es })}</p>
                    </div>
                    <Select value={h.estado} onValueChange={(v) => handleMove(h, v as Hipotesis['estado'])}>
                      <SelectTrigger className="h-7 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLUMNAS.map((c) => (
                          <SelectItem key={c.estado} value={c.estado} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground/60">
                  Sin hipótesis acá
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
