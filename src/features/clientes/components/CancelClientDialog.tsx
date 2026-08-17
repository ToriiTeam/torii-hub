import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cancelClient } from '@/features/clientes/lib/cancelClient';

interface Props {
  client: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

const emptyForm = {
  motivo: '',
  fecha: new Date().toISOString().slice(0, 10),
};

// Diálogo de cancelación compartido entre la grilla (Clientes.tsx) y el
// header de ClienteDetalle.tsx — mismo comportamiento en los dos lugares,
// la única diferencia es qué hace cada consumidor al terminar (onCancelled).
export function CancelClientDialog({ client, open, onOpenChange, onCancelled }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { if (open) setForm(emptyForm); }, [open]);

  async function handleConfirm() {
    if (!client) return;
    if (!form.motivo.trim()) { toast.error('El motivo es requerido'); return; }
    setCancelling(true);
    const error = await cancelClient(client.id, form.motivo, form.fecha);
    setCancelling(false);
    if (error) { toast.error('Error al cancelar el cliente'); return; }
    toast.success('Cliente cancelado');
    onOpenChange(false);
    onCancelled();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Cancelar cliente</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {client?.name} pasará a estado <strong>Cancelado</strong> y dejará de contarse como cliente activo.
          No se elimina ningún dato — todo su historial queda accesible.
        </p>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Motivo de cancelación *</Label>
            <Textarea
              value={form.motivo}
              onChange={e => setForm({ ...form, motivo: e.target.value })}
              className="bg-secondary/50 mt-1"
              rows={3}
              placeholder="Por qué se cancela este cliente..."
            />
          </div>
          <div>
            <Label>Fecha de cancelación</Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="bg-secondary/50 mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Volver</Button>
          <Button
            onClick={handleConfirm}
            disabled={cancelling || !form.motivo.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {cancelling ? 'Cancelando…' : 'Confirmar cancelación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
