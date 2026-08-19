import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PegarCodigoField } from './PegarCodigoField';
import {
  addLandingVariant, updateLandingVariant, type LandingVariant, type LandingVariantInput,
} from '@/features/vsl-funnel/lib/vslFunnelRepo';

const emptyForm: LandingVariantInput = {
  titulo: '', codigo_pegado: '', tipo: null, notas: '', fecha_desde: '', fecha_hasta: '', vsl_entry_id: null,
} as unknown as LandingVariantInput;

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LandingVariant | null;
  vslEntryId: string | null; // asociada a este VSL, o null = landing suelta
  onSaved: () => void;
}

export function LandingVariantFormDialog({ clientId, open, onOpenChange, editing, vslEntryId, onSaved }: Props) {
  const [form, setForm] = useState<LandingVariantInput>(emptyForm);
  const [videoEmbedUrl, setVideoEmbedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        titulo: editing.titulo,
        codigo_pegado: editing.codigo_pegado ?? '',
        tipo: editing.tipo,
        notas: editing.notas ?? '',
        fecha_desde: editing.fecha_desde ?? '',
        fecha_hasta: editing.fecha_hasta ?? '',
        vsl_entry_id: editing.vsl_entry_id,
      });
      setVideoEmbedUrl(editing.video_embed_url);
    } else {
      setForm({ ...emptyForm, vsl_entry_id: vslEntryId });
      setVideoEmbedUrl(null);
    }
  }, [open, editing, vslEntryId]);

  async function handleSave() {
    if (!form.titulo.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      const payload: LandingVariantInput = {
        ...form,
        titulo: form.titulo.trim(),
        fecha_desde: form.fecha_desde || null,
        fecha_hasta: form.fecha_hasta || null,
      };
      if (editing) {
        await updateLandingVariant(editing.id, payload, videoEmbedUrl);
        toast.success('Landing actualizada');
      } else {
        await addLandingVariant(clientId, payload);
        toast.success('Landing agregada');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('[LandingVariantFormDialog] save failed:', err);
      toast.error('Error al guardar la landing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar landing' : 'Nueva landing'}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={form.tipo ?? '__none'} onValueChange={(v) => setForm({ ...form, tipo: v === '__none' ? null : (v as LandingVariantInput['tipo']) })}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                <SelectItem value="estructura_completa">Estructura completa</SelectItem>
                <SelectItem value="solo_titular">Solo titular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PegarCodigoField
            label="Código pegado (HTML)"
            codigoPegado={form.codigo_pegado ?? ''}
            videoEmbedUrl={videoEmbedUrl}
            onChange={(codigo, video) => { setForm({ ...form, codigo_pegado: codigo }); setVideoEmbedUrl(video); }}
          />
          <div>
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea rows={2} value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="bg-secondary/50 mt-1 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Activo desde</Label>
              <Input type="date" value={form.fecha_desde ?? ''} onChange={(e) => setForm({ ...form, fecha_desde: e.target.value })} className="bg-secondary/50 mt-1" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Activo hasta</Label>
              <Input type="date" value={form.fecha_hasta ?? ''} onChange={(e) => setForm({ ...form, fecha_hasta: e.target.value })} className="bg-secondary/50 mt-1" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
