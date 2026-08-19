import { useEffect, useState } from 'react';
import { ChevronRight, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PegarCodigoField } from './PegarCodigoField';
import { RichTextEditor } from './RichTextEditor';
import { VslMetricasResumen } from './VslMetricasResumen';
import { LandingVariantCard } from './LandingVariantCard';
import { AddLandingTile } from './AddLandingTile';
import { updateVslEntry, deleteVslEntry, type VslEntry, type VslEntryInput, type LandingVariant } from '@/features/vsl-funnel/lib/vslFunnelRepo';
import type { Database } from '@/integrations/supabase/types';

type TrackedLanding = Database['public']['Tables']['tracked_landings']['Row'];

function fmtDate(d: string) {
  return format(parseISO(d), 'dd/MM/yy');
}

function activoDesdeHasta(fechaDesde: string | null, fechaHasta: string | null): string | null {
  if (!fechaDesde) return null;
  return fechaHasta ? `Activo del ${fmtDate(fechaDesde)} al ${fmtDate(fechaHasta)}` : `Activo desde ${fmtDate(fechaDesde)}`;
}

function toInput(e: VslEntry): VslEntryInput {
  return {
    titulo: e.titulo, copy: e.copy, codigo_pegado: e.codigo_pegado, notas: e.notas,
    hipotesis_doc: e.hipotesis_doc, fecha_desde: e.fecha_desde, fecha_hasta: e.fecha_hasta,
    tracked_landing_id: e.tracked_landing_id,
  };
}

interface Props {
  entry: VslEntry;
  variants: LandingVariant[];
  trackedLandings: TrackedLanding[];
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onAddVariant: () => void;
  onEditVariant: (v: LandingVariant) => void;
  onDeleteVariant: (v: LandingVariant) => void;
}

export function VslEntryCard({ entry, variants, trackedLandings, expanded, onToggle, onChanged, onAddVariant, onEditVariant, onDeleteVariant }: Props) {
  const [form, setForm] = useState<VslEntryInput>(() => toInput(entry));
  const [videoEmbedUrl, setVideoEmbedUrl] = useState(entry.video_embed_url);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Resetea el form local cada vez que se re-expande (o cuando cambian los
  // datos del servidor, ej. después de guardar) — evita arrastrar ediciones
  // sin guardar de una sesión de expansión anterior.
  useEffect(() => {
    setForm(toInput(entry));
    setVideoEmbedUrl(entry.video_embed_url);
  }, [entry]);

  async function handleSave() {
    if (!form.titulo.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    try {
      await updateVslEntry(entry.id, { ...form, titulo: form.titulo.trim() }, videoEmbedUrl);
      toast.success('VSL actualizado');
      onChanged();
    } catch (err) {
      console.error('[VslEntryCard] save failed:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteVslEntry(entry.id);
      toast.success('VSL eliminado');
      setDeleteOpen(false);
      onChanged();
    } catch (err) {
      console.error('[VslEntryCard] delete failed:', err);
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  const trackedLanding = trackedLandings.find((l) => l.id === form.tracked_landing_id);
  const activo = activoDesdeHasta(entry.fecha_desde, entry.fecha_hasta);

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{entry.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Las landings asociadas no se borran, quedan sin VSL asociado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer hover:bg-secondary/20" onClick={onToggle}>
        <div className="flex items-center gap-2.5 min-w-0">
          <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-90')} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{entry.titulo}</p>
            <p className="text-[11px] text-muted-foreground/70">
              Actualizado {formatDistanceToNow(parseISO(entry.updated_at), { locale: es, addSuffix: true })}
              {activo && ` · ${activo}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {variants.length > 0 && (
            <Badge className="bg-info/15 text-info border-0 text-[10px]">{variants.length} landing{variants.length !== 1 ? 's' : ''}</Badge>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }} title="Eliminar">
            <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PegarCodigoField
              label="Video (código pegado)"
              codigoPegado={form.codigo_pegado ?? ''}
              videoEmbedUrl={videoEmbedUrl}
              onChange={(codigo, video) => { setForm({ ...form, codigo_pegado: codigo }); setVideoEmbedUrl(video); }}
            />
            <div>
              <Label className="text-xs text-muted-foreground">Copy</Label>
              <Textarea rows={7} value={form.copy ?? ''} onChange={(e) => setForm({ ...form, copy: e.target.value })} className="bg-secondary/50 mt-1 resize-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Notas</Label>
                <Textarea rows={3} value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="bg-secondary/50 mt-1 resize-none" />
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
              <div>
                <Label className="text-xs text-muted-foreground">Landing trackeada (para métricas)</Label>
                <Select value={form.tracked_landing_id ?? '__none'} onValueChange={(v) => setForm({ ...form, tracked_landing_id: v === '__none' ? null : v })}>
                  <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Sin vincular —</SelectItem>
                    {trackedLandings.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hipótesis / qué se está testeando</Label>
              <div className="mt-1">
                <RichTextEditor
                  content={form.hipotesis_doc}
                  onChange={(doc) => setForm({ ...form, hipotesis_doc: doc })}
                  minHeight="120px"
                />
              </div>
            </div>
          </div>

          {trackedLanding && <VslMetricasResumen landingId={trackedLanding.landing_id} />}

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Guardar cambios
            </Button>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Landings asociadas a este VSL</span>
              <span className="text-[11px] text-muted-foreground">{variants.length} variante{variants.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {variants.map((v) => (
                <LandingVariantCard key={v.id} variant={v} onEdit={() => onEditVariant(v)} onDelete={() => onDeleteVariant(v)} />
              ))}
              <AddLandingTile label="+ Agregar variante" onClick={onAddVariant} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
