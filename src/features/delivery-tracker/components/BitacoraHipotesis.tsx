import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { addHipotesis, type Hipotesis } from '@/features/delivery-tracker/lib/deliveryOsRepo';

const ESTADO_COLOR: Record<Hipotesis['estado'], string> = {
  validado: 'text-success',
  testeando: 'text-warning',
  matado: 'text-destructive',
  a_iterar: 'text-muted-foreground',
};

const emptyForm = { texto: '', metrica: '', responsable: '', fecha: new Date().toISOString().slice(0, 10) };

interface Props {
  clientId: string;
  hipotesis: Hipotesis[];
  onChanged: () => void;
}

export function BitacoraHipotesis({ clientId, hipotesis, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!form.texto.trim()) { toast.error('La hipótesis es requerida'); return; }
    setSaving(true);
    try {
      await addHipotesis(clientId, form);
      toast.success('Hipótesis agregada');
      setDialogOpen(false);
      setForm(emptyForm);
      onChanged();
    } catch (err) {
      console.error('[BitacoraHipotesis] add failed:', err);
      toast.error('Error al agregar la hipótesis');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Nueva hipótesis</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Hipótesis *</Label>
              <Textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className="bg-secondary/50 mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Métrica</Label><Input value={form.metrica} onChange={(e) => setForm({ ...form, metrica: e.target.value })} className="bg-secondary/50 mt-1" /></div>
              <div><Label>Dueño</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} className="bg-secondary/50 mt-1" /></div>
            </div>
            <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="bg-secondary/50 mt-1" style={{ colorScheme: 'dark' }} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-primary">{saving ? 'Guardando…' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center mb-3.5">
        <h2 className="font-sans font-extrabold text-lg m-0">Bitácora de hipótesis</h2>
        <Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Nueva hipótesis
        </Button>
      </div>

      {hipotesis.length === 0 ? (
        <div className="border border-border/50 rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Todavía no hay hipótesis cargadas para este cliente.
        </div>
      ) : (
        <div className="border border-border/50 rounded-2xl overflow-hidden overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[60px_1.6fr_90px_100px_90px_1fr] gap-2.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 bg-secondary/30">
              <span>Fecha</span><span>Hipótesis</span><span>Métrica</span><span>Dueño</span><span>Estado</span><span>Resultado</span>
            </div>
            {hipotesis.map((h) => (
              <div key={h.id} className="grid grid-cols-[60px_1.6fr_90px_100px_90px_1fr] gap-2.5 px-4 py-2.5 text-sm border-t border-border/40 items-center">
                <span className="text-[11px] text-muted-foreground/70">{format(parseISO(h.fecha), 'd MMM', { locale: es })}</span>
                <span className="truncate">{h.texto}</span>
                <span className="text-xs text-muted-foreground/70 truncate">{h.metrica || '—'}</span>
                <span className="text-xs text-muted-foreground/70 truncate">{h.responsable || '—'}</span>
                <span className={cn('text-xs font-semibold capitalize', ESTADO_COLOR[h.estado])}>{h.estado.replace('_', ' ')}</span>
                <span className="text-xs text-muted-foreground/70 truncate">{h.resultado || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
