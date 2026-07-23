import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ExternalLink, Trash2, Loader2, Upload, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import {
  ESTADO_LABELS, TIPO_LABELS, HYPOTHESIS_RESULTADO_LABELS,
} from '@/features/creative-tree/types';
import type { CreativeEstado, CreativeNode, CreativeTipo, HypothesisHistoryEntry, HypothesisResultado } from '@/features/creative-tree/types';
import { deleteNode, updateNode } from '@/features/creative-tree/lib/creativeNodesRepo';
import { fetchOpenHypothesis, closeHypothesis } from '@/features/creative-tree/lib/hypothesisHistoryRepo';
import { IMAGE_ACCEPT, isImageUrl, uploadCreativeImage } from '@/features/creative-tree/lib/media';

const ESTADOS = Object.keys(ESTADO_LABELS) as CreativeEstado[];
const TIPOS = Object.keys(TIPO_LABELS) as CreativeTipo[];
const HYPOTHESIS_RESULTADOS = Object.keys(HYPOTHESIS_RESULTADO_LABELS) as HypothesisResultado[];

type MediaMode = 'link' | 'imagen';

interface FormState {
  nombre: string;
  angulo: string;
  hipotesis: string;
  estado: CreativeEstado;
  tipo: CreativeTipo;
  media_url: string;
  notas: string;
}

function toForm(node: CreativeNode): FormState {
  return {
    nombre: node.nombre,
    angulo: node.angulo ?? '',
    hipotesis: node.hipotesis ?? '',
    estado: node.estado,
    tipo: node.tipo,
    media_url: node.media_url ?? '',
    notas: node.notas ?? '',
  };
}

interface Props {
  clientId: string;
  node: CreativeNode | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function CreativeDetailPanel({ clientId, node, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormState | null>(node ? toForm(node) : null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mediaMode, setMediaMode] = useState<MediaMode>('link');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Hipótesis abierta (hypothesis_history) ──────────────────────────────
  const [openHypothesis, setOpenHypothesis] = useState<HypothesisHistoryEntry | null>(null);
  const [loadingHypothesis, setLoadingHypothesis] = useState(false);
  const [closingForm, setClosingForm] = useState(false);
  const [resultado, setResultado] = useState<HypothesisResultado>('ganador');
  const [aprendizaje, setAprendizaje] = useState('');
  const [savingClose, setSavingClose] = useState(false);

  useEffect(() => {
    setForm(node ? toForm(node) : null);
    // Auto-detect which control to show based on the existing value.
    setMediaMode(node && isImageUrl(node.media_url) ? 'imagen' : 'link');
    setClosingForm(false);
    setResultado('ganador');
    setAprendizaje('');

    if (!node) { setOpenHypothesis(null); return; }
    setLoadingHypothesis(true);
    fetchOpenHypothesis(node.id)
      .then(setOpenHypothesis)
      .catch((err) => {
        console.error('[CreativeDetailPanel] failed to load open hypothesis:', err);
        setOpenHypothesis(null);
      })
      .finally(() => setLoadingHypothesis(false));
  }, [node]);

  if (!node || !form) return null;

  async function handleCloseHypothesis() {
    if (!openHypothesis) return;
    if (!aprendizaje.trim()) { toast.error('El aprendizaje es requerido'); return; }
    setSavingClose(true);
    try {
      await closeHypothesis(openHypothesis.id, {
        resultado,
        aprendizaje: aprendizaje.trim(),
        fecha_cierre: new Date().toISOString().slice(0, 10),
      });
      toast.success('Hipótesis cerrada');
      setOpenHypothesis(null);
      setClosingForm(false);
    } catch (err) {
      console.error('[CreativeDetailPanel] close hypothesis failed:', err);
      toast.error('Error al cerrar la hipótesis');
    } finally {
      setSavingClose(false);
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !node) return;

    setUploadingImage(true);
    try {
      const url = await uploadCreativeImage(clientId, node.id, file);
      upd('media_url', url);
      toast.success('Imagen subida — guardá los cambios para confirmar');
    } catch (err) {
      console.error('[CreativeDetailPanel] image upload failed:', err);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  }

  function upd<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!node || !form) return;
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await updateNode(node.id, {
        nombre: form.nombre.trim(),
        angulo: form.angulo || null,
        hipotesis: form.hipotesis || null,
        estado: form.estado,
        tipo: form.tipo,
        media_url: form.media_url || null,
        notas: form.notas || null,
      });
      toast.success('Guardado');
      onSaved();
    } catch (err) {
      console.error('[CreativeDetailPanel] save failed:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!node) return;
    if (!window.confirm(`¿Eliminar "${node.nombre}"? Sus iteraciones hijas quedarán sin padre. Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await deleteNode(node.id);
      toast.success('Nodo eliminado');
      onDeleted();
    } catch (err) {
      console.error('[CreativeDetailPanel] delete failed:', err);
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="bg-card border-border overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{node.parent_id ? 'Detalle de la iteración' : 'Detalle del ángulo base'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => upd('nombre', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>

          <div>
            <Label>Ángulo</Label>
            <Input value={form.angulo} onChange={(e) => upd('angulo', e.target.value)} className="bg-secondary/50 mt-1" placeholder="Ej: Miedo al estancamiento" />
          </div>

          <div>
            <Label>Hipótesis</Label>
            <Textarea rows={3} value={form.hipotesis} onChange={(e) => upd('hipotesis', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
          </div>

          {/* ── Hipótesis abierta (hypothesis_history) ──────────────────── */}
          {loadingHypothesis ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando historial de hipótesis…
            </div>
          ) : openHypothesis && (
            <div className="rounded-md border border-border/50 bg-secondary/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Hipótesis en curso desde {openHypothesis.fecha_inicio}
                </div>
                {!closingForm && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setClosingForm(true)}>
                    Cerrar hipótesis
                  </Button>
                )}
              </div>

              {closingForm && (
                <div className="space-y-3">
                  <div>
                    <Label>Resultado</Label>
                    <Select value={resultado} onValueChange={(v) => setResultado(v as HypothesisResultado)}>
                      <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HYPOTHESIS_RESULTADOS.map((r) => <SelectItem key={r} value={r}>{HYPOTHESIS_RESULTADO_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Aprendizaje</Label>
                    <Textarea
                      rows={2}
                      value={aprendizaje}
                      onChange={(e) => setAprendizaje(e.target.value)}
                      className="bg-secondary/50 mt-1 resize-none"
                      placeholder="Qué aprendimos de este test..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setClosingForm(false)} disabled={savingClose}>Cancelar</Button>
                    <Button size="sm" onClick={handleCloseHypothesis} disabled={savingClose}>
                      {savingClose ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                      Guardar cierre
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator className="bg-border/40" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => upd('estado', v as CreativeEstado)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => upd('tipo', v as CreativeTipo)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Media</Label>
            <Select value={mediaMode} onValueChange={(v) => setMediaMode(v as MediaMode)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link (video/Drive)</SelectItem>
                <SelectItem value="imagen">Subir imagen</SelectItem>
              </SelectContent>
            </Select>

            {mediaMode === 'link' ? (
              <div className="flex gap-2 mt-2">
                <Input value={form.media_url} onChange={(e) => upd('media_url', e.target.value)} className="bg-secondary/50" placeholder="https://..." />
                {form.media_url && (
                  <Button variant="outline" size="icon" onClick={() => window.open(form.media_url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                  {uploadingImage
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Upload className="h-3.5 w-3.5 mr-1.5" />
                  }
                  {form.media_url ? 'Reemplazar imagen' : 'Subir imagen'}
                </Button>
                {form.media_url && isImageUrl(form.media_url) && (
                  <img src={form.media_url} alt="Preview" className="max-h-48 rounded-md border border-border/50 object-contain" />
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea rows={3} value={form.notas} onChange={(e) => upd('notas', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Eliminar nodo
            </Button>
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
