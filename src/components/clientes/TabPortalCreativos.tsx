import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Image as ImageIcon, Video, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYoutubeId, getDriveThumbnailUrl, isDirectImageUrl } from '@/lib/embedUrl';

// ─── Types ──────────────────────────────────────────────────────────────

type CreativeType = 'image' | 'video' | 'copy';
type CreativeStatus = 'active' | 'paused' | 'archived';

interface ClientCreative {
  id: string;
  client_id: string;
  title: string;
  type: CreativeType;
  channel: string | null;
  status: CreativeStatus;
  url: string;
  thumbnail_url: string | null;
  notes: string | null;
  cpl: number | null;
  ctr: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const typeLabels: Record<CreativeType, string> = { image: 'Imagen', video: 'Video', copy: 'Copy' };
const typeIcons: Record<CreativeType, typeof ImageIcon> = { image: ImageIcon, video: Video, copy: Type };

const statusLabels: Record<CreativeStatus, string> = { active: 'Activo', paused: 'Pausado', archived: 'Archivado' };
const statusColors: Record<CreativeStatus, string> = {
  active: 'bg-success/20 text-success',
  paused: 'bg-warning/20 text-warning',
  archived: 'bg-secondary text-muted-foreground',
};

const ALL = 'all';
const emptyForm = {
  title: '', type: 'image' as CreativeType, channel: '', status: 'active' as CreativeStatus,
  url: '', cpl: '', ctr: '', notes: '',
};

interface Props {
  clientId: string;
}

export default function TabPortalCreativos({ clientId }: Props) {
  const [creatives, setCreatives] = useState<ClientCreative[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterStatus, setFilterStatus] = useState<string>(ALL);
  const [filterChannel, setFilterChannel] = useState<string>(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientCreative | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_creatives')
      .select('id, client_id, title, type, channel, status, url, thumbnail_url, notes, cpl, ctr, created_at, updated_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setCreatives((data ?? []) as ClientCreative[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchCreatives(); }, [fetchCreatives]);

  const channels = useMemo(
    () => Array.from(new Set(creatives.map(c => c.channel).filter((c): c is string => !!c))),
    [creatives],
  );

  const filtered = creatives.filter(c => {
    if (filterType !== ALL && c.type !== filterType) return false;
    if (filterStatus !== ALL && c.status !== filterStatus) return false;
    if (filterChannel !== ALL && c.channel !== filterChannel) return false;
    return true;
  });

  function openNew() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Título y URL son requeridos');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('client_creatives').insert({
      client_id: clientId,
      title: form.title.trim(),
      type: form.type,
      channel: form.channel.trim() || null,
      status: form.status,
      url: form.url.trim(),
      cpl: form.cpl ? parseFloat(form.cpl) : null,
      ctr: form.ctr ? parseFloat(form.ctr) : null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear el creativo'); return; }
    toast.success('Creativo agregado');
    setDialogOpen(false);
    fetchCreatives();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('client_creatives').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar el creativo'); return; }
    toast.success('Creativo eliminado');
    setDeleteTarget(null);
    fetchCreatives();
  }

  if (loading) return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Creativos ({filtered.length})
          </CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />Agregar creativo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={cn('cursor-pointer hover:bg-secondary/50', filterType === ALL && 'bg-primary/20 text-primary')}
                onClick={() => setFilterType(ALL)}
              >
                Todos los tipos
              </Badge>
              {(Object.keys(typeLabels) as CreativeType[]).map(t => (
                <Badge
                  key={t}
                  variant="outline"
                  className={cn('cursor-pointer hover:bg-secondary/50', filterType === t && 'bg-primary/20 text-primary')}
                  onClick={() => setFilterType(t)}
                >
                  {typeLabels[t]}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={cn('cursor-pointer hover:bg-secondary/50', filterStatus === ALL && 'bg-primary/20 text-primary')}
                onClick={() => setFilterStatus(ALL)}
              >
                Todos los status
              </Badge>
              {(Object.keys(statusLabels) as CreativeStatus[]).map(s => (
                <Badge
                  key={s}
                  variant="outline"
                  className={cn('cursor-pointer hover:bg-secondary/50', filterStatus === s && statusColors[s])}
                  onClick={() => setFilterStatus(s)}
                >
                  {statusLabels[s]}
                </Badge>
              ))}
            </div>
            {channels.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('cursor-pointer hover:bg-secondary/50', filterChannel === ALL && 'bg-primary/20 text-primary')}
                  onClick={() => setFilterChannel(ALL)}
                >
                  Todos los canales
                </Badge>
                {channels.map(ch => (
                  <Badge
                    key={ch}
                    variant="outline"
                    className={cn('cursor-pointer hover:bg-secondary/50', filterChannel === ch && 'bg-primary/20 text-primary')}
                    onClick={() => setFilterChannel(ch)}
                  >
                    {ch}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin creativos que coincidan con los filtros.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(c => (
                <CreativeCard key={c.id} creative={c} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New creative dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar creativo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-secondary/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as CreativeType })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(typeLabels) as CreativeType[]).map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Canal (opcional)</Label>
                <Input value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="bg-secondary/50" placeholder="Meta Ads, TikTok..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as CreativeStatus })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusLabels) as CreativeStatus[]).map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="bg-secondary/50" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CPL (opcional)</Label>
                <Input type="number" step="0.01" value={form.cpl} onChange={e => setForm({ ...form, cpl: e.target.value })} className="bg-secondary/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CTR % (opcional)</Label>
                <Input type="number" step="0.01" value={form.ctr} onChange={e => setForm({ ...form, ctr: e.target.value })} className="bg-secondary/50" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary/50" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este creativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se va a eliminar "{deleteTarget?.title}" permanentemente.
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
    </div>
  );
}

// ─── Card sub-component ────────────────────────────────────────────────

function CreativeCard({ creative, onDelete }: { creative: ClientCreative; onDelete: () => void }) {
  const TypeIcon = typeIcons[creative.type];

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="relative bg-secondary/40" style={{ paddingBottom: creative.type === 'copy' ? undefined : '56.25%' }}>
        {creative.type === 'video' ? (
          getYoutubeId(creative.url) ? (
            <img
              src={`https://img.youtube.com/vi/${getYoutubeId(creative.url)}/hqdefault.jpg`}
              alt={creative.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              {creative.url.includes('loom.com') ? 'Loom' : 'Video'}
            </div>
          )
        ) : creative.type === 'image' ? (
          <img
            src={isDirectImageUrl(creative.url) ? creative.url : getDriveThumbnailUrl(creative.url)}
            alt={creative.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="p-4">
            <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
              {creative.notes || <span className="italic">Sin notas</span>}
            </p>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate flex-1">{creative.title}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1">
            <TypeIcon className="h-3 w-3" />{typeLabels[creative.type]}
          </Badge>
          <Badge className={cn('text-xs border-0', statusColors[creative.status])}>
            {statusLabels[creative.status]}
          </Badge>
          {creative.channel && <Badge variant="outline" className="text-xs">{creative.channel}</Badge>}
        </div>
        {(creative.cpl != null || creative.ctr != null) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {creative.cpl != null && <span>CPL: ${creative.cpl}</span>}
            {creative.ctr != null && <span>CTR: {creative.ctr}%</span>}
          </div>
        )}
      </div>
    </div>
  );
}
