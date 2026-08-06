import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateCycleNode } from '@/features/roadmap-cycles/lib/cyclesRepo';
import type { RoadmapCycleNode } from '@/features/roadmap-cycles/types';

interface FormState {
  nombre: string;
  descripcion: string;
  output: string;
}

function toForm(node: RoadmapCycleNode): FormState {
  return { nombre: node.nombre, descripcion: node.descripcion ?? '', output: node.output ?? '' };
}

interface Props {
  node: RoadmapCycleNode | null;
  onClose: () => void;
  onSaved: () => void;
}

// Same Sheet + Save-button contract as CreativeDetailPanel — the roadmap's
// own EditableField (click-to-edit, save-on-blur) is for the dense phase/
// process fields; a React Flow node detail follows the tree's convention.
export function CycleDetailPanel({ node, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState | null>(node ? toForm(node) : null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(node ? toForm(node) : null); }, [node]);

  if (!node || !form) return null;

  function upd<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!node || !form) return;
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await updateCycleNode(node.id, {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        output: form.output || null,
      });
      toast.success('Guardado');
      onSaved();
    } catch (err) {
      console.error('[CycleDetailPanel] save failed:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="bg-card border-border overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Etapa del ciclo</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => upd('nombre', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea rows={3} value={form.descripcion} onChange={(e) => upd('descripcion', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
          </div>

          <div>
            <Label>Output (opcional)</Label>
            <Input value={form.output} onChange={(e) => upd('output', e.target.value)} className="bg-secondary/50 mt-1" placeholder="Ej: Ángulo Ganador" />
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
