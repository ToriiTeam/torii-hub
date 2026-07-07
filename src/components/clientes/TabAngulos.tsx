import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Link2, Loader2, Sparkles, User } from 'lucide-react';

interface Angle {
  id: string;
  nombre: string | null;
  narrativa: string | null;
  hipotesis_activa: string | null;
  estado: string | null;
  origen: string | null;
  creative_node_id: string | null;
}

interface CreativeNodeOption {
  id: string;
  nombre: string;
}

const ESTADOS = [
  { value: 'activo', label: 'Activo' },
  { value: 'testeando', label: 'Testeando' },
  { value: 'descartado', label: 'Descartado' },
  { value: 'ganador', label: 'Ganador' },
];

const ESTADO_STYLE: Record<string, string> = {
  activo: 'bg-info/20 text-info',
  testeando: 'bg-warning/20 text-warning',
  descartado: 'bg-secondary text-muted-foreground',
  ganador: 'bg-success/20 text-success',
};

const ESTADO_LABEL: Record<string, string> = Object.fromEntries(ESTADOS.map((e) => [e.value, e.label]));

const emptyForm = { nombre: '', narrativa: '', hipotesis_activa: '', estado: 'activo' };

interface Props {
  clientId: string;
}

export default function TabAngulos({ clientId }: Props) {
  const [angles, setAngles] = useState<Angle[]>([]);
  const [nodes, setNodes] = useState<CreativeNodeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [linkTarget, setLinkTarget] = useState<Angle | null>(null);
  const [linkNodeId, setLinkNodeId] = useState('');
  const [linking, setLinking] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [anglesRes, nodesRes] = await Promise.all([
      supabase
        .from('angles')
        .select('id, nombre, narrativa, hipotesis_activa, estado, origen, creative_node_id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('creative_nodes')
        .select('id, nombre')
        .eq('client_id', clientId)
        .order('nombre'),
    ]);
    if (anglesRes.data) setAngles(anglesRes.data as Angle[]);
    if (nodesRes.data) setNodes(nodesRes.data as CreativeNodeOption[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const nodeNameById = new Map(nodes.map((n) => [n.id, n.nombre]));
  const filtered = filterEstado === 'all' ? angles : angles.filter((a) => a.estado === filterEstado);

  async function handleCreate() {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    const { error } = await supabase.from('angles').insert({
      client_id: clientId,
      nombre: form.nombre.trim(),
      narrativa: form.narrativa || null,
      hipotesis_activa: form.hipotesis_activa || null,
      estado: form.estado,
      origen: 'manual',
    });
    setSaving(false);
    if (error) { toast.error('Error al crear el ángulo'); return; }
    toast.success('Ángulo creado');
    setDialogOpen(false);
    setForm(emptyForm);
    fetchAll();
  }

  async function handleLink() {
    if (!linkTarget || !linkNodeId) return;
    setLinking(true);
    const { error } = await supabase.from('angles').update({ creative_node_id: linkNodeId }).eq('id', linkTarget.id);
    setLinking(false);
    if (error) { toast.error('Error al vincular'); return; }
    toast.success('Ángulo vinculado al árbol de creativos');
    setLinkTarget(null);
    setLinkNodeId('');
    fetchAll();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      {/* ── Nuevo ángulo ────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(emptyForm); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nuevo ángulo</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: Miedo al estancamiento"
              />
            </div>
            <div>
              <Label>Narrativa</Label>
              <Textarea
                value={form.narrativa}
                onChange={(e) => setForm({ ...form, narrativa: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={3}
                placeholder="Qué historia cuenta este ángulo..."
              />
            </div>
            <div>
              <Label>Hipótesis activa</Label>
              <Textarea
                value={form.hipotesis_activa}
                onChange={(e) => setForm({ ...form, hipotesis_activa: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={2}
                placeholder="Por qué creemos que este ángulo va a funcionar..."
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving || !form.nombre.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Crear ángulo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Vincular a nodo del árbol ─────────────────────────────────────── */}
      <Dialog open={!!linkTarget} onOpenChange={(open) => !open && setLinkTarget(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Vincular "{linkTarget?.nombre}" a un nodo</DialogTitle></DialogHeader>
          <div className="mt-2">
            <Label>Nodo del árbol de creativos</Label>
            <Select value={linkNodeId} onValueChange={setLinkNodeId}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue placeholder="Elegir nodo..." /></SelectTrigger>
              <SelectContent>
                {nodes.map((n) => <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {nodes.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Este cliente todavía no tiene nodos en el Árbol de Creativos.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setLinkTarget(null)}>Cancelar</Button>
            <Button onClick={handleLink} disabled={!linkNodeId || linking}>
              {linking ? 'Vinculando…' : 'Vincular'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Banco de ángulos
          </span>
          <Badge variant="outline" className="text-xs">{angles.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="bg-secondary/50 h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo ángulo
          </Button>
        </div>
      </div>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((angle) => {
          const estado = angle.estado ?? 'activo';
          const linkedNodeName = angle.creative_node_id ? nodeNameById.get(angle.creative_node_id) : null;
          return (
            <Card key={angle.id} className="bg-card border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-tight">{angle.nombre || 'Sin nombre'}</p>
                  <Badge className={cn('text-xs border-0 shrink-0', ESTADO_STYLE[estado] ?? ESTADO_STYLE.activo)}>
                    {ESTADO_LABEL[estado] ?? estado}
                  </Badge>
                </div>

                {angle.narrativa && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{angle.narrativa}</p>
                )}

                {angle.hipotesis_activa && (
                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    Hipótesis: {angle.hipotesis_activa}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Badge variant="outline" className="text-xs gap-1">
                    {angle.origen === 'arbol' ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {angle.origen === 'arbol' ? 'Desde árbol' : 'Manual'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => { setLinkTarget(angle); setLinkNodeId(angle.creative_node_id ?? ''); }}
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    {linkedNodeName ?? 'Vincular'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="bg-card border-border/50 col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              {angles.length === 0 ? 'Todavía no hay ángulos registrados para este cliente' : 'Sin ángulos con este estado'}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
