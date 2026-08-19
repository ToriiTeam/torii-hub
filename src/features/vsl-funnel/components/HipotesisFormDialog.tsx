import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { addHipotesis, updateHipotesis, type Hipotesis } from '@/features/delivery-tracker/lib/deliveryOsRepo';

const emptyForm = { texto: '', metrica: '', responsable: '', fecha: new Date().toISOString().slice(0, 10) };

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Hipotesis | null;
  onSaved: () => void;
}

// Mismo form para alta y edición — evita duplicarlo. `editing` decide si
// se llama a addHipotesis o updateHipotesis.
export function HipotesisFormDialog({ clientId, open, onOpenChange, editing, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { texto: editing.texto, metrica: editing.metrica ?? '', responsable: editing.responsable ?? '', fecha: editing.fecha }
        : emptyForm);
    }
  }, [open, editing]);

  async function handleSubmit() {
    if (!form.texto.trim()) { toast.error('La hipótesis es requerida'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateHipotesis(editing.id, form);
        toast.success('Hipótesis actualizada');
      } else {
        await addHipotesis(clientId, form);
        toast.success('Hipótesis agregada');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('[HipotesisFormDialog] save failed:', err);
      toast.error('Error al guardar la hipótesis');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>{editing ? 'Editar hipótesis' : 'Nueva hipótesis'}</DialogTitle></DialogHeader>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary">
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
