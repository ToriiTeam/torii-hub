import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ListTree, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TrackedLanding = Database['public']['Tables']['tracked_landings']['Row'];

// Único set de business lines en uso hoy (ver AnaliticasView.tsx de Máquina
// de Cierres y el default de la columna). Si se agrega una línea de negocio
// nueva, sumarla acá.
const BUSINESS_LINES = [
  { value: 'torii-ads', label: 'Torii Ads' },
  { value: 'maquina-cierres', label: 'Máquina de Cierres' },
] as const;

// Sentinel para los <Select> — Radix no permite value="" en un SelectItem.
const NONE = '__none__';

interface FormState {
  landing_id: string;
  label: string;
  client_id: string;
  business_line: string;
  group_id: string;
}

const emptyForm: FormState = {
  landing_id: '',
  label: '',
  client_id: NONE,
  business_line: BUSINESS_LINES[0].value,
  group_id: NONE,
};

export default function Landings() {
  const [landings, setLandings] = useState<TrackedLanding[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [unregistered, setUnregistered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [landingsRes, clientsRes, eventsRes] = await Promise.all([
        supabase.from('tracked_landings').select('*').order('label'),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('vsl_events').select('landing_id'),
      ]);
      if (landingsRes.error) throw landingsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const tracked = landingsRes.data ?? [];
      setLandings(tracked);
      setClients(clientsRes.data ?? []);

      const trackedIds = new Set(tracked.map((l) => l.landing_id));
      const seenInEvents = new Set(
        (eventsRes.data ?? []).map((e) => e.landing_id).filter((id): id is string => !!id),
      );
      setUnregistered(Array.from(seenInEvents).filter((id) => !trackedIds.has(id)).sort());
    } catch (err) {
      console.error('[Landings] load failed:', err);
      toast.error('Error al cargar las landings');
    } finally {
      setLoading(false);
    }
  }

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const landingById = useMemo(() => new Map(landings.map((l) => [l.id, l])), [landings]);

  // Solo landings sin group_id propio pueden ser padre de otra — mismo
  // criterio que restringe el rollup a un solo nivel en /vsl.
  const rootOptions = useMemo(
    () => landings.filter((l) => l.group_id === null && l.id !== editingId),
    [landings, editingId],
  );

  // Orden: cada root primero, seguido de sus hijas (alfabético dentro de
  // cada grupo) — así la jerarquía se lee de un vistazo sin armar un árbol.
  const orderedLandings = useMemo(() => {
    const roots = landings.filter((l) => l.group_id === null).sort((a, b) => a.label.localeCompare(b.label));
    const result: { landing: TrackedLanding; depth: number }[] = [];
    for (const root of roots) {
      result.push({ landing: root, depth: 0 });
      const children = landings
        .filter((l) => l.group_id === root.id)
        .sort((a, b) => a.label.localeCompare(b.label));
      for (const child of children) result.push({ landing: child, depth: 1 });
    }
    return result;
  }, [landings]);

  function openAddDialog(prefillLandingId?: string) {
    setEditingId(null);
    setForm({ ...emptyForm, landing_id: prefillLandingId ?? '' });
    setDialogOpen(true);
  }

  function openEditDialog(l: TrackedLanding) {
    setEditingId(l.id);
    setForm({
      landing_id: l.landing_id,
      label: l.label,
      client_id: l.client_id ?? NONE,
      business_line: l.business_line,
      group_id: l.group_id ?? NONE,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.landing_id.trim()) { toast.error('El landing_id es requerido'); return; }
    if (!form.label.trim()) { toast.error('El label es requerido'); return; }

    setSaving(true);
    try {
      const payload = {
        landing_id: form.landing_id.trim(),
        label: form.label.trim(),
        client_id: form.client_id === NONE ? null : form.client_id,
        business_line: form.business_line,
        group_id: form.group_id === NONE ? null : form.group_id,
      };

      if (editingId) {
        // landing_id no se edita acá — es la clave que ya está grabada en
        // vsl_events, cambiarla rompería el join con eventos históricos.
        const { error } = await supabase
          .from('tracked_landings')
          .update({ label: payload.label, client_id: payload.client_id, business_line: payload.business_line, group_id: payload.group_id })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Landing actualizada');
      } else {
        const { error } = await supabase.from('tracked_landings').insert(payload);
        if (error) throw error;
        toast.success('Landing registrada');
      }

      setDialogOpen(false);
      loadAll();
    } catch (err) {
      console.error('[Landings] save failed:', err);
      toast.error(editingId ? 'Error al actualizar la landing' : 'Error al registrar la landing');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(l: TrackedLanding, active: boolean) {
    try {
      const { error } = await supabase.from('tracked_landings').update({ active }).eq('id', l.id);
      if (error) throw error;
      setLandings((prev) => prev.map((x) => (x.id === l.id ? { ...x, active } : x)));
    } catch (err) {
      console.error('[Landings] toggle active failed:', err);
      toast.error('Error al cambiar el estado');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landings</h1>
          <p className="text-muted-foreground">
            Registro de landings trackeadas — alimenta los selectores de /vsl y /maquina-cierres
          </p>
        </div>
        <Button onClick={() => openAddDialog()}>
          <Plus className="h-4 w-4 mr-1.5" />Agregar landing
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {unregistered.length > 0 && (
            <Card className="bg-warning/5 border-warning/30">
              <CardHeader>
                <CardTitle className="text-base font-medium">Landings sin registrar</CardTitle>
                <CardDescription>
                  Aparecen en vsl_events pero no tienen fila en tracked_landings — no van a mostrarse en los selectores hasta que se registren.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {unregistered.map((id) => (
                  <div key={id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <code className="text-sm">{id}</code>
                    <Button size="sm" variant="secondary" onClick={() => openAddDialog(id)}>Registrar</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ListTree className="h-5 w-5 text-primary" />
                Landings registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderedLandings.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">Sin landings registradas todavía</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Landing</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Línea de negocio</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedLandings.map(({ landing: l, depth }) => (
                      <TableRow key={l.id} className={!l.active ? 'opacity-50' : undefined}>
                        <TableCell className="font-mono text-xs">
                          <span style={{ paddingLeft: depth * 16 }}>
                            {depth > 0 && '↳ '}{l.landing_id}
                          </span>
                        </TableCell>
                        <TableCell>{l.label}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.client_id ? (clientById.get(l.client_id) ?? '—') : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {BUSINESS_LINES.find((b) => b.value === l.business_line)?.label ?? l.business_line}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {l.group_id ? (landingById.get(l.group_id)?.label ?? '—') : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={l.active} onCheckedChange={(v) => toggleActive(l, v)} />
                            <span className="text-xs text-muted-foreground">{l.active ? 'Activa' : 'Inactiva'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(l)}>
                            <PencilLine className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar landing' : 'Nueva landing'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>landing_id *</Label>
              <Input
                value={form.landing_id}
                onChange={(e) => setForm({ ...form, landing_id: e.target.value })}
                placeholder="ej. torii-hook-nuevo-angulo"
                disabled={!!editingId}
                className="bg-secondary/50 mt-1 font-mono text-sm"
              />
              {editingId && (
                <p className="text-xs text-muted-foreground mt-1">No se puede editar — es la clave usada en vsl_events.</p>
              )}
            </div>
            <div>
              <Label>Label *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Nombre para mostrar en el dashboard"
                className="bg-secondary/50 mt-1"
              />
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguno (Torii)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Línea de negocio</Label>
              <Select value={form.business_line} onValueChange={(v) => setForm({ ...form, business_line: v })}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_LINES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cuelga de</Label>
              <Select value={form.group_id} onValueChange={(v) => setForm({ ...form, group_id: v })}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguna (landing independiente)</SelectItem>
                  {rootOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Solo landings sin grupo propio pueden ser padre — evita anidar más de un nivel.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar' : 'Registrar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
