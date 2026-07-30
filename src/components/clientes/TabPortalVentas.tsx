import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink, Video, FileText, Link as LinkIcon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfWeek } from 'date-fns';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { getEmbedUrl, getDriveEmbedUrl } from '@/lib/embedUrl';

// ─── Types ──────────────────────────────────────────────────────────────

interface ClientCloser { id: string; client_id: string; name: string; active: boolean | null; created_at: string | null; }

type MaterialType = 'video' | 'document' | 'link' | 'analysis_video';
interface SalesMaterial {
  id: string; client_id: string; title: string; description: string | null;
  type: MaterialType | null; url: string; order_index: number | null; created_at: string | null;
}

interface ClosingCall {
  id: string; closer: string | null; fecha_llamada: string | null;
  se_presento: boolean | null; cerro: boolean | null;
}

const materialTypeLabels: Record<MaterialType, string> = {
  video: 'Videos', document: 'Documentos', link: 'Links', analysis_video: 'Videos de análisis de llamadas',
};
const materialTypeIcons: Record<MaterialType, typeof Video> = {
  video: Video, document: FileText, link: LinkIcon, analysis_video: Video,
};

interface Props {
  clientId: string;
}

export default function TabPortalVentas({ clientId }: Props) {
  return (
    <div className="space-y-4">
      <CloserRosterCard clientId={clientId} />
      <SalesMaterialsCard clientId={clientId} />
      <TrendChartCard clientId={clientId} />
      <PerCloserChartCard clientId={clientId} />
    </div>
  );
}

// ─── Closer roster ──────────────────────────────────────────────────────

function CloserRosterCard({ clientId }: { clientId: string }) {
  const [closers, setClosers] = useState<ClientCloser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClosers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_closers')
      .select('id, client_id, name, active, created_at')
      .eq('client_id', clientId)
      .order('name');
    setClosers((data ?? []) as ClientCloser[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchClosers(); }, [fetchClosers]);

  async function handleAdd() {
    if (!newName.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    const { error } = await supabase.from('client_closers').insert({ client_id: clientId, name: newName.trim(), active: true });
    setSaving(false);
    if (error) { toast.error('Error al agregar el closer'); return; }
    toast.success('Closer agregado');
    setNewName('');
    fetchClosers();
  }

  async function toggleActive(closer: ClientCloser) {
    const { error } = await supabase.from('client_closers').update({ active: !closer.active }).eq('id', closer.id);
    if (error) { toast.error('Error al actualizar'); return; }
    fetchClosers();
  }

  const visible = closers.filter(c => showInactive || c.active);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Roster de closers ({visible.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive-closers" />
          <Label htmlFor="show-inactive-closers" className="text-sm text-muted-foreground cursor-pointer">Ver inactivos</Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Nuevo closer</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-secondary/50 h-9" placeholder="Nombre" />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving}>
            <Plus className="h-4 w-4 mr-1.5" />Agregar
          </Button>
        </div>
        {loading ? (
          <div className="h-16 rounded-lg bg-secondary/40 animate-pulse" />
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin closers cargados todavía.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visible.map(c => (
              <Badge
                key={c.id}
                variant="outline"
                className={cn('cursor-pointer gap-1.5', !c.active && 'opacity-50')}
                onClick={() => toggleActive(c)}
              >
                {c.name}
                <span className={cn('h-1.5 w-1.5 rounded-full', c.active ? 'bg-success' : 'bg-muted-foreground')} />
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sales materials ────────────────────────────────────────────────────

const emptyMaterialForm = { title: '', description: '', type: 'video' as MaterialType, url: '', order_index: '0' };

function SalesMaterialsCard({ clientId }: { clientId: string }) {
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyMaterialForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesMaterial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sales_materials')
      .select('id, client_id, title, description, type, url, order_index, created_at')
      .eq('client_id', clientId)
      .order('order_index', { ascending: true });
    setMaterials((data ?? []) as SalesMaterial[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  function openNew() {
    setForm(emptyMaterialForm);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.url.trim()) { toast.error('Título y URL son requeridos'); return; }
    setSaving(true);
    const { error } = await supabase.from('sales_materials').insert({
      client_id: clientId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      url: form.url.trim(),
      order_index: parseInt(form.order_index) || 0,
    });
    setSaving(false);
    if (error) { toast.error('Error al agregar el material'); return; }
    toast.success('Material agregado');
    setDialogOpen(false);
    fetchMaterials();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('sales_materials').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar el material'); return; }
    toast.success('Material eliminado');
    setDeleteTarget(null);
    fetchMaterials();
  }

  const byType = (t: MaterialType) => materials.filter(m => (m.type ?? 'link') === t);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Material de apoyo ({materials.length})
        </CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1.5" />Agregar material
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
        ) : materials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin material cargado todavía.</p>
        ) : (
          (Object.keys(materialTypeLabels) as MaterialType[]).map(type => {
            const items = byType(type);
            if (items.length === 0) return null;
            return (
              <section key={type} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {materialTypeLabels[type]}
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(m => (
                    <MaterialCard key={m.id} material={m} onDelete={() => setDeleteTarget(m)} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </CardContent>

      {/* New material dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as MaterialType })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(materialTypeLabels) as MaterialType[]).map(t => <SelectItem key={t} value={t}>{materialTypeLabels[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Orden</Label>
                <Input type="number" value={form.order_index} onChange={e => setForm({ ...form, order_index: e.target.value })} className="bg-secondary/50" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="bg-secondary/50" placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-secondary/50" rows={3} />
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
            <AlertDialogTitle>¿Eliminar este material?</AlertDialogTitle>
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
    </Card>
  );
}

function MaterialCard({ material, onDelete }: { material: SalesMaterial; onDelete: () => void }) {
  const type = material.type ?? 'link';
  const Icon = materialTypeIcons[type];

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {(type === 'video' || type === 'analysis_video') ? (
        <div className="relative bg-secondary/40" style={{ paddingBottom: '56.25%' }}>
          <iframe src={getEmbedUrl(material.url)} className="absolute inset-0 w-full h-full border-0" allow="autoplay; fullscreen" allowFullScreen title={material.title} />
        </div>
      ) : type === 'document' ? (
        <iframe src={getDriveEmbedUrl(material.url)} className="w-full h-40 border-0" title={material.title} />
      ) : (
        <a href={material.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 text-sm text-primary hover:underline">
          <ExternalLink className="h-4 w-4 shrink-0" />{material.url}
        </a>
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate flex-1 flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{material.title}
          </p>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {material.description && <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>}
      </div>
    </div>
  );
}

// ─── Trend chart ────────────────────────────────────────────────────────

interface TrendPoint { period: string; agendas: number; se_presento: number; cerro: number; show_rate: number; close_rate: number; }

function buildTrendData(calls: ClosingCall[]): TrendPoint[] {
  const map = new Map<string, { period: string; agendas: number; se_presento: number; cerro: number }>();
  for (const c of calls) {
    if (!c.fecha_llamada) continue;
    let date: Date;
    try { date = parseISO(c.fecha_llamada); } catch { continue; }
    const bucketKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    let point = map.get(bucketKey);
    if (!point) { point = { period: bucketKey, agendas: 0, se_presento: 0, cerro: 0 }; map.set(bucketKey, point); }
    point.agendas++;
    if (c.se_presento) point.se_presento++;
    if (c.cerro) point.cerro++;
  }
  return Array.from(map.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(p => ({
      ...p,
      show_rate: p.agendas > 0 ? Math.round((p.se_presento / p.agendas) * 100) : 0,
      close_rate: p.se_presento > 0 ? Math.round((p.cerro / p.se_presento) * 100) : 0,
    }));
}

function useClosingCalls(clientId: string) {
  const [calls, setCalls] = useState<ClosingCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('client_closer_calls')
      .select('id, closer, fecha_llamada, se_presento, cerro')
      .eq('owner_type', 'client')
      .eq('client_id', clientId)
      .then(({ data }) => { if (!cancelled) { setCalls((data ?? []) as ClosingCall[]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [clientId]);

  return { calls, loading };
}

function TrendChartCard({ clientId }: { clientId: string }) {
  const { calls, loading } = useClosingCalls(clientId);
  const data = useMemo(() => buildTrendData(calls), [calls]);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tendencia</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin llamadas registradas todavía.</p>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => `${v}%`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="show_rate" stroke="hsl(var(--info))" strokeWidth={2} dot={false} name="Show rate" />
                <Line type="monotone" dataKey="close_rate" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Close rate" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Per-closer chart ───────────────────────────────────────────────────

interface CloserPoint { closer: string; agendas: number; cerrados: number; close_rate: number; active: boolean | null; }

function buildPerCloserData(calls: ClosingCall[], roster: ClientCloser[]): CloserPoint[] {
  const rosterByName = new Map(roster.map(c => [c.name, c.active]));
  const map = new Map<string, { agendas: number; cerrados: number }>();
  for (const c of calls) {
    const name = c.closer || 'Sin asignar';
    let point = map.get(name);
    if (!point) { point = { agendas: 0, cerrados: 0 }; map.set(name, point); }
    point.agendas++;
    if (c.cerro) point.cerrados++;
  }
  return Array.from(map.entries())
    .map(([closer, p]) => ({
      closer, agendas: p.agendas, cerrados: p.cerrados,
      close_rate: p.agendas > 0 ? Math.round((p.cerrados / p.agendas) * 100) : 0,
      active: rosterByName.get(closer) ?? null,
    }))
    .sort((a, b) => b.agendas - a.agendas);
}

function PerCloserChartCard({ clientId }: { clientId: string }) {
  const { calls, loading: loadingCalls } = useClosingCalls(clientId);
  const [roster, setRoster] = useState<ClientCloser[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  useEffect(() => {
    supabase
      .from('client_closers')
      .select('id, client_id, name, active, created_at')
      .eq('client_id', clientId)
      .then(({ data }) => { setRoster((data ?? []) as ClientCloser[]); setLoadingRoster(false); });
  }, [clientId]);

  const data = useMemo(() => buildPerCloserData(calls, roster), [calls, roster]);
  const loading = loadingCalls || loadingRoster;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" />Performance por closer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin llamadas registradas todavía.</p>
        ) : (
          <>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="closer" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="agendas" fill="hsl(var(--info))" name="Agendas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cerrados" fill="hsl(var(--success))" name="Cerrados" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {data.map(d => (
                <Badge key={d.closer} variant="outline" className={cn('text-xs', d.active === false && 'opacity-50')}>
                  {d.closer}: {d.close_rate}% close rate
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
