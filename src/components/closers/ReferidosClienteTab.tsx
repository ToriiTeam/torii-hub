import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Mismo modelo y misma regla de cálculo de estado que ReferidosPage.tsx en
// torii-portal (Sistema de Referidos con IA) — ver ese archivo para el
// criterio original. estado es exclusivo del bot de GHL y del webhook de
// agendamiento: nunca se muestra ni se edita en este form, ni al crear ni
// al editar.

interface Referido {
  id: string;
  referido_nombre: string;
  presentado_por: string | null;
  referido_telefono: string | null;
  perfil_referido: string | null;
  warm_intro: boolean;
  incentivo: string | null;
  estado: string;
  fecha_pedido: string;
  origen_call_id: string | null;
}

interface ReferidoFormState {
  referido_nombre: string;
  presentado_por: string;
  referido_telefono: string;
  perfil_referido: string;
  warm_intro: boolean;
  incentivo: string;
}

const EMPTY_FORM: ReferidoFormState = {
  referido_nombre: '',
  presentado_por: '',
  referido_telefono: '',
  perfil_referido: '',
  warm_intro: true,
  incentivo: '',
};

const INCENTIVO_OPTIONS: { value: string; label: string }[] = [
  { value: 'relacional', label: 'Relacional' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'monetario', label: 'Monetario' },
  { value: 'ninguno', label: 'Ninguno' },
];

const ESTADO_LABELS: Record<string, string> = {
  pendiente_datos: 'Esperando datos',
  pendiente_contacto: 'Por contactar',
  contactado: 'Contactado',
  en_proceso: 'En conversación',
  cerrado: 'Cerrado',
  no_califico: 'No calificó',
};

const ESTADO_CLASSES: Record<string, string> = {
  pendiente_datos: 'bg-secondary text-muted-foreground',
  pendiente_contacto: 'bg-warning/20 text-warning',
  contactado: 'bg-info/20 text-info',
  en_proceso: 'bg-primary/20 text-primary',
  cerrado: 'bg-success/20 text-success',
  no_califico: 'bg-secondary text-muted-foreground',
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge className={cnBadge(ESTADO_CLASSES[estado])}>
      {ESTADO_LABELS[estado] ?? estado}
    </Badge>
  );
}

// Badge de este proyecto no tiene variant "neutral" con clases custom por
// default — se pasan directo como className, mismo patrón que YES_NO_BADGE
// en Closers.tsx.
function cnBadge(classes: string): string {
  return `text-xs border-0 whitespace-nowrap ${classes}`;
}

function fmtDate(d: string) {
  try { return format(parseISO(d), 'dd/MM/yy'); } catch { return '—'; }
}

interface Props {
  clientId: string;
}

export default function ReferidosClienteTab({ clientId }: Props) {
  const [referidos, setReferidos] = useState<Referido[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Referido | null>(null);
  const [form, setForm] = useState<ReferidoFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('referidos')
      .select('id, referido_nombre, presentado_por, referido_telefono, perfil_referido, warm_intro, incentivo, estado, fecha_pedido, origen_call_id')
      .eq('client_id', clientId)
      .order('fecha_pedido', { ascending: false });
    setReferidos((data ?? []) as Referido[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(r: Referido) {
    setEditing(r);
    setForm({
      referido_nombre: r.referido_nombre,
      presentado_por: r.presentado_por ?? '',
      referido_telefono: r.referido_telefono ?? '',
      perfil_referido: r.perfil_referido ?? '',
      warm_intro: r.warm_intro,
      incentivo: r.incentivo ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.referido_nombre.trim() || !form.presentado_por.trim()) {
      toast.error('Nombre del referido y quién lo presentó son obligatorios');
      return;
    }
    setSaving(true);

    if (editing) {
      // estado solo se recalcula si todavía está en un estado "pre-contacto"
      // (pendiente_datos/pendiente_contacto) — una vez que el bot de GHL o
      // el webhook de agendamiento lo movió más allá, esta key ni se manda
      // en el UPDATE. Mismo criterio exacto que ReferidosPage.tsx.
      const updatePayload: Record<string, unknown> = {
        referido_nombre: form.referido_nombre.trim(),
        presentado_por: form.presentado_por.trim(),
        referido_telefono: form.referido_telefono.trim() || null,
        perfil_referido: form.perfil_referido.trim() || null,
        warm_intro: form.warm_intro,
        incentivo: form.incentivo || null,
      };
      if (editing.estado === 'pendiente_datos' || editing.estado === 'pendiente_contacto') {
        updatePayload.estado = form.referido_telefono.trim() ? 'pendiente_contacto' : 'pendiente_datos';
      }
      const { error } = await supabase.from('referidos').update(updatePayload).eq('id', editing.id);
      setSaving(false);
      if (error) { toast.error('Error al guardar el referido'); return; }
    } else {
      const estado = form.referido_telefono.trim() ? 'pendiente_contacto' : 'pendiente_datos';
      const { error } = await supabase.from('referidos').insert({
        client_id: clientId,
        referido_nombre: form.referido_nombre.trim(),
        presentado_por: form.presentado_por.trim(),
        referido_telefono: form.referido_telefono.trim() || null,
        perfil_referido: form.perfil_referido.trim() || null,
        warm_intro: form.warm_intro,
        incentivo: form.incentivo || null,
        origen_call_id: null,
        estado,
        fecha_pedido: new Date().toISOString().slice(0, 10),
      });
      setSaving(false);
      if (error) { toast.error('Error al crear el referido'); return; }
    }

    toast.success(editing ? 'Referido actualizado' : 'Referido agregado');
    setDialogOpen(false);
    fetchData();
  }

  if (loading) return (
    <div className="h-40 rounded-lg bg-secondary/40 animate-pulse" />
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Referidos ({referidos.length})
          </CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />Agregar referido
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referido</TableHead>
                <TableHead>Presentado por</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-center">Warm intro</TableHead>
                <TableHead>Incentivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de pedido</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {referidos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.referido_nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.presentado_por || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{r.perfil_referido || '—'}</TableCell>
                  <TableCell className="text-center">
                    {r.warm_intro ? <span className="text-success font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {INCENTIVO_OPTIONS.find(o => o.value === r.incentivo)?.label ?? '—'}
                  </TableCell>
                  <TableCell><EstadoBadge estado={r.estado} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(r.fecha_pedido)}</TableCell>
                  <TableCell>
                    <Badge className={cnBadge(r.origen_call_id ? 'bg-info/20 text-info' : 'bg-secondary text-muted-foreground')}>
                      {r.origen_call_id ? 'Llamada' : 'Manual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {referidos.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin referidos cargados todavía.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Agregar'} referido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre del referido *</Label>
              <Input value={form.referido_nombre} onChange={e => setForm(f => ({ ...f, referido_nombre: e.target.value }))} className="bg-secondary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Presentado por *</Label>
              <Input value={form.presentado_por} onChange={e => setForm(f => ({ ...f, presentado_por: e.target.value }))} className="bg-secondary/50" placeholder="Nombre del cliente que hizo la referencia" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.referido_telefono} onChange={e => setForm(f => ({ ...f, referido_telefono: e.target.value }))} className="bg-secondary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Perfil del referido</Label>
              <Textarea value={form.perfil_referido} onChange={e => setForm(f => ({ ...f, perfil_referido: e.target.value }))} className="bg-secondary/50" rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Incentivo</Label>
              <Select value={form.incentivo || 'none'} onValueChange={v => setForm(f => ({ ...f, incentivo: v === 'none' ? '' : v }))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {INCENTIVO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.warm_intro} onCheckedChange={v => setForm(f => ({ ...f, warm_intro: v }))} id="warm-intro" />
              <Label htmlFor="warm-intro" className="text-sm cursor-pointer">Warm intro (ya hubo contacto directo)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
