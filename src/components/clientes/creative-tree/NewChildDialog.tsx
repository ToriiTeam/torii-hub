import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TIPO_LABELS } from '@/features/creative-tree/types';
import type { CreativeTipo } from '@/features/creative-tree/types';
import { createNode, setNodeMediaUrl } from '@/features/creative-tree/lib/creativeNodesRepo';
import { IMAGE_ACCEPT, uploadCreativeImage } from '@/features/creative-tree/lib/media';

const TIPOS = Object.keys(TIPO_LABELS) as CreativeTipo[];
type MediaMode = 'link' | 'imagen';

interface Props {
  clientId: string;
  parentId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

export function NewChildDialog({ clientId, parentId, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<CreativeTipo>('video');
  const [mediaMode, setMediaMode] = useState<MediaMode>('link');
  const [mediaLink, setMediaLink] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!mediaFile) { setFilePreviewUrl(null); return; }
    const url = URL.createObjectURL(mediaFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  async function handleCreate() {
    if (!nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const node = await createNode({ client_id: clientId, parent_id: parentId, nombre: nombre.trim(), tipo });

      if (mediaMode === 'link' && mediaLink.trim()) {
        await setNodeMediaUrl(node.id, mediaLink.trim());
      } else if (mediaMode === 'imagen' && mediaFile) {
        const url = await uploadCreativeImage(clientId, node.id, mediaFile);
        await setNodeMediaUrl(node.id, url);
      }

      toast.success(parentId ? 'Iteración creada' : 'Ángulo base creado');
      onCreated();
    } catch (err) {
      console.error('[NewChildDialog] create failed:', err);
      toast.error('Error al crear el nodo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>{parentId ? 'Nueva iteración' : 'Nuevo ángulo base'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-secondary/50 mt-1"
              placeholder="Ej: V2 - hook reformulado"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as CreativeTipo)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Media (opcional)</Label>
            <Select value={mediaMode} onValueChange={(v) => setMediaMode(v as MediaMode)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link (video/Drive)</SelectItem>
                <SelectItem value="imagen">Subir imagen</SelectItem>
              </SelectContent>
            </Select>

            {mediaMode === 'link' ? (
              <Input
                value={mediaLink}
                onChange={(e) => setMediaLink(e.target.value)}
                className="bg-secondary/50 mt-2"
                placeholder="https://..."
              />
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {mediaFile ? mediaFile.name : 'Elegir imagen'}
                </Button>
                {filePreviewUrl && (
                  <img src={filePreviewUrl} alt="Preview" className="max-h-32 rounded-md border border-border/50 object-contain" />
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving || !nombre.trim()} className="bg-primary">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {saving ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
