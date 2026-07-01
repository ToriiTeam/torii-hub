import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Loader2, FlaskConical, Save } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hypothesis {
  id: string;
  client_id: string;
  titulo: string | null;
  hipotesis: string | null;
  area: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_decision: string | null;
  resultado: string | null;
  confianza: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AREAS = [
  { value: 'setting',       label: 'Setting' },
  { value: 'ads',            label: 'Ads' },
  { value: 'oferta',         label: 'Oferta' },
  { value: 'cierre',         label: 'Cierre' },
  { value: 'fullfillment',  label: 'Fullfillment' },
];

const ESTADOS = [
  { value: 'activa',      label: 'Activa' },
  { value: 'confirmada',  label: 'Confirmada' },
  { value: 'refutada',    label: 'Refutada' },
  { value: 'pausada',     label: 'Pausada' },
];

const CONFIANZAS = [
  { value: 'alta',  label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja',  label: 'Baja' },
];

const estadoStyle: Record<string, string> = {
  activa:     'bg-info/20 text-info',
  confirmada: 'bg-success/20 text-success',
  refutada:   'bg-destructive/20 text-destructive',
  pausada:    'bg-secondary text-muted-foreground',
};

const confianzaStyle: Record<string, string> = {
  alta:  'bg-success/20 text-success',
  media: 'bg-warning/20 text-warning',
  baja:  'bg-destructive/20 text-destructive',
};

const emptyForm = {
  titulo: '', hipotesis: '', area: 'setting', estado: 'activa',
  fecha_inicio: new Date().toISOString().slice(0, 10), fecha_decision: '',
  resultado: '', confianza: 'media',
};

type FormState = typeof emptyForm;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  try {
    const parsed = parseISO(d);
    return isValid(parsed) ? format(parsed, 'd MMM yyyy', { locale: es }) : '—';
  } catch { return '—'; }
}

function label(list: { value: string; label: string }[], v: string | null) {
  return list.find(i => i.value === v)?.label ?? v ?? '—';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

export default function TabHipotesis({ clientId }: Props) {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Hypothesis | null>(null);
  const [detailForm, setDetailForm] = useState<FormState>(emptyForm);
  const [detailSaving, setDetailSaving] = useState(false);

  const fetchHypotheses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_hypotheses')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) toast.error('Error al cargar hipótesis');
    else setHypotheses((data ?? []) as Hypothesis[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchHypotheses(); }, [fetchHypotheses]);

  const filtered = useMemo(() => {
    return hypotheses.filter(h =>
      (filterEstado === 'all' || h.estado === filterEstado) &&
      (filterArea === 'all' || h.area === filterArea)
    );
  }, [hypotheses, filterEstado, filterArea]);

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newForm.titulo.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    const { error } = await supabase.from('client_hypotheses').insert({
      client_id:      clientId,
      titulo:         newForm.titulo,
      hipotesis:      newForm.hipotesis || null,
      area:           newForm.area,
      estado:         newForm.estado,
      fecha_inicio:   newForm.fecha_inicio || null,
      fecha_decision: newForm.fecha_decision || null,
      resultado:      newForm.resultado || null,
      confianza:      newForm.confianza,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear hipótesis'); return; }
    toast.success('Hipótesis creada');
    setNewDialogOpen(false);
    setNewForm(emptyForm);
    fetchHypotheses();
  };

  // ── Detail / edit ────────────────────────────────────────────────────────
  const openDetail = (h: Hypothesis) => {
    setDetail(h);
    setDetailForm({
      titulo:         h.titulo ?? '',
      hipotesis:      h.hipotesis ?? '',
      area:           h.area ?? 'setting',
      estado:         h.estado,
      fecha_inicio:   h.fecha_inicio ?? '',
      fecha_decision: h.fecha_decision ?? '',
      resultado:      h.resultado ?? '',
      confianza:      h.confianza ?? 'media',
    });
  };

  const handleUpdate = async () => {
    if (!detail) return;
    setDetailSaving(true);
    const { error } = await supabase
      .from('client_hypotheses')
      .update({
        titulo:         detailForm.titulo || null,
        hipotesis:      detailForm.hipotesis || null,
        area:           detailForm.area,
        estado:         detailForm.estado,
        fecha_inicio:   detailForm.fecha_inicio || null,
        fecha_decision: detailForm.fecha_decision || null,
        resultado:      detailForm.resultado || null,
        confianza:      detailForm.confianza,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', detail.id);
    setDetailSaving(false);
    if (error) { toast.error('Error al guardar cambios'); return; }
    toast.success('Hipótesis actualizada');
    setDetail(null);
    fetchHypotheses();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      {/* ── New hypothesis dialog ───────────────────────────────────────── */}
      <Dialog open={newDialogOpen} onOpenChange={open => { setNewDialogOpen(open); if (!open) setNewForm(emptyForm); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nueva hipótesis</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={newForm.titulo}
                onChange={e => setNewForm({ ...newForm, titulo: e.target.value })}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: Mensaje con prueba social aumenta tasa de agenda"
              />
            </div>
            <div>
              <Label>Hipótesis</Label>
              <Textarea
                value={newForm.hipotesis}
                onChange={e => setNewForm({ ...newForm, hipotesis: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={3}
                placeholder="Si hacemos X, esperamos Y porque Z..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Área</Label>
                <Select value={newForm.area} onValueChange={v => setNewForm({ ...newForm, area: v })}>
                  <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={newForm.estado} onValueChange={v => setNewForm({ ...newForm, estado: v })}>
                  <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha de inicio</Label>
                <Input
                  type="date"
                  value={newForm.fecha_inicio}
                  onChange={e => setNewForm({ ...newForm, fecha_inicio: e.target.value })}
                  className="bg-secondary/50 mt-1"
                />
              </div>
              <div>
                <Label>Confianza</Label>
                <Select value={newForm.confianza} onValueChange={v => setNewForm({ ...newForm, confianza: v })}>
                  <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONFIANZAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Crear hipótesis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail / edit dialog ────────────────────────────────────────── */}
      <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{detail?.titulo || 'Detalle de hipótesis'}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Título</Label>
                <Input
                  value={detailForm.titulo}
                  onChange={e => setDetailForm({ ...detailForm, titulo: e.target.value })}
                  className="bg-secondary/50 mt-1"
                />
              </div>
              <div>
                <Label>Hipótesis</Label>
                <Textarea
                  value={detailForm.hipotesis}
                  onChange={e => setDetailForm({ ...detailForm, hipotesis: e.target.value })}
                  className="bg-secondary/50 mt-1 resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Área</Label>
                  <Select value={detailForm.area} onValueChange={v => setDetailForm({ ...detailForm, area: v })}>
                    <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={detailForm.estado} onValueChange={v => setDetailForm({ ...detailForm, estado: v })}>
                    <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha de inicio</Label>
                  <Input
                    type="date"
                    value={detailForm.fecha_inicio}
                    onChange={e => setDetailForm({ ...detailForm, fecha_inicio: e.target.value })}
                    className="bg-secondary/50 mt-1"
                  />
                </div>
                <div>
                  <Label>Fecha de decisión</Label>
                  <Input
                    type="date"
                    value={detailForm.fecha_decision}
                    onChange={e => setDetailForm({ ...detailForm, fecha_decision: e.target.value })}
                    className="bg-secondary/50 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Confianza</Label>
                  <Select value={detailForm.confianza} onValueChange={v => setDetailForm({ ...detailForm, confianza: v })}>
                    <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONFIANZAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Resultado</Label>
                <Textarea
                  value={detailForm.resultado}
                  onChange={e => setDetailForm({ ...detailForm, resultado: e.target.value })}
                  className="bg-secondary/50 mt-1 resize-none"
                  rows={3}
                  placeholder="Qué pasó al testear esta hipótesis, con qué datos..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetail(null)}>Cerrar</Button>
                <Button onClick={handleUpdate} disabled={detailSaving}>
                  {detailSaving
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5 mr-1.5" />
                  }
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Header + filters ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Hipótesis
          </span>
          <Badge variant="outline" className="text-xs">{filtered.length} de {hypotheses.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="bg-secondary/50 w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="bg-secondary/50 w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Nueva hipótesis
          </Button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              {hypotheses.length === 0 ? 'No hay hipótesis registradas todavía' : 'Ningún resultado para estos filtros'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Título</TableHead>
                  <TableHead>Hipótesis</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Confianza</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Decisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(h => (
                  <TableRow
                    key={h.id}
                    className="border-border/30 cursor-pointer hover:bg-secondary/30"
                    onClick={() => openDetail(h)}
                  >
                    <TableCell className="font-medium max-w-48 truncate" title={h.titulo ?? ''}>
                      {h.titulo || <span className="text-muted-foreground italic">Sin título</span>}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-muted-foreground" title={h.hipotesis ?? ''}>
                      {h.hipotesis || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{label(AREAS, h.area)}</TableCell>
                    <TableCell>
                      <Badge className={cn('border-0 text-xs', estadoStyle[h.estado] ?? estadoStyle['pausada'])}>
                        {label(ESTADOS, h.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {h.confianza && (
                        <Badge className={cn('border-0 text-xs', confianzaStyle[h.confianza] ?? '')}>
                          {label(CONFIANZAS, h.confianza)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(h.fecha_inicio)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(h.fecha_decision)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
