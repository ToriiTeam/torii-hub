import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, ExternalLink, Check, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ALL_CHANNELS, CHANNELS, CHANNEL_LABELS,
  type Channel, type ContenidoTabProps, type ContentCalendarItem,
} from './types';
import { pillarStyle } from './pillarStyle';

const NONE = 'none';
const ALL = 'all';
const FASES = ['Fase 0', 'Fase 1', 'Fase 2'] as const;
const ESTADOS = ['Idea', 'Esperando Grabación', 'Esperando Edición', 'Programado', 'Publicado'] as const;

const ESTADO_BADGE: Record<string, string> = {
  'Idea': 'bg-secondary text-muted-foreground',
  'Esperando Grabación': 'bg-warning/20 text-warning',
  'Esperando Edición': 'bg-warning/20 text-warning',
  'Programado': 'bg-info/20 text-info',
  'Publicado': 'bg-success/20 text-success',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return isValid(parseISO(d)) ? format(parseISO(d), 'dd/MM/yy', { locale: es }) : '—'; } catch { return '—'; }
}

// ─── Per-channel field config ───────────────────────────────────────────────
// channel_fields is a single jsonb blob — this table drives both the "Nueva
// pieza" dialog (only the fields relevant to the active channel show up,
// not one giant form with everything optional) and the extra table columns
// for that channel.

type FieldType = 'text' | 'url' | 'boolean';
interface FieldDef { key: string; label: string; type: FieldType; }

const CHANNEL_FIELDS: Record<Channel, FieldDef[]> = {
  youtube: [
    { key: 'numero_video', label: 'N° video', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'formato_video', label: 'Formato', type: 'text' },
    { key: 'guion_url', label: 'Guion', type: 'url' },
    { key: 'recurso_url', label: 'Recurso', type: 'url' },
    { key: 'miniatura_url', label: 'Miniatura', type: 'url' },
    { key: 'referencia', label: 'Referencia', type: 'text' },
    { key: 'creadores_inspiracion', label: 'Creadores de inspiración', type: 'text' },
  ],
  instagram: [
    { key: 'tipologia', label: 'Tipología', type: 'text' },
    { key: 'grabacion_url', label: 'Grabación', type: 'url' },
    { key: 'video_editado_url', label: 'Video editado', type: 'url' },
    { key: 'notas_hook', label: 'Notas / Hook', type: 'text' },
    { key: 'creadores_inspiracion', label: 'Creadores de inspiración', type: 'text' },
  ],
  linkedin: [
    { key: 'programado', label: 'Programado', type: 'boolean' },
    { key: 'guion_url', label: 'Guión', type: 'url' },
    { key: 'lead_magnet_creado', label: 'Lead magnet creado', type: 'boolean' },
    { key: 'tipo_post', label: 'Tipo de post', type: 'text' },
    { key: 'recurso_a_enviar', label: 'Recurso a enviar', type: 'text' },
    { key: 'enlace_recurso', label: 'Enlace a recurso', type: 'url' },
    { key: 'cuentas_inspiracion', label: 'Cuentas de inspiración', type: 'text' },
  ],
};

function LinkCell({ url }: { url: unknown }) {
  const href = typeof url === 'string' ? url : '';
  if (!href.trim()) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={href}>
      <ExternalLink className="h-3.5 w-3.5 text-primary hover:text-primary/70" />
    </a>
  );
}

function BoolCell({ value }: { value: unknown }) {
  return value === true
    ? <Check className="h-3.5 w-3.5 text-success" />
    : <X className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

// ─── NewPieceDialog ─────────────────────────────────────────────────────────

function NewPieceDialog({ channel, clientId, pillars, mechanisms, hypotheses, onClose, onCreated }: {
  channel: Channel;
  clientId: string | null;
  pillars: ContenidoTabProps['pillars'];
  mechanisms: ContenidoTabProps['mechanisms'];
  hypotheses: ContenidoTabProps['hypotheses'];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [core, setCore] = useState({
    fase: NONE, semana: '', pilarId: NONE, mecanismoId: NONE,
    conAsk: true, leadMagnet: '', hipotesisId: NONE, estado: ESTADOS[0] as string,
    fechaProgramada: '', titulo: '', descripcion: '',
  });
  const [extra, setExtra] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);

  const fields = CHANNEL_FIELDS[channel];
  const channelHypotheses = hypotheses.filter((h) => h.channel === channel);

  function updCore<K extends keyof typeof core>(key: K, value: typeof core[K]) {
    setCore((prev) => ({ ...prev, [key]: value }));
  }
  function updExtra(key: string, value: string | boolean) {
    setExtra((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!core.titulo.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);

    const channelFields: Record<string, string | boolean> = {};
    for (const f of fields) {
      const v = extra[f.key];
      if (f.type === 'boolean') channelFields[f.key] = v === true;
      else if (typeof v === 'string' && v.trim()) channelFields[f.key] = v.trim();
    }

    const { error } = await supabase.from('content_calendar').insert({
      client_id: clientId,
      channel,
      fase: core.fase === NONE ? null : core.fase,
      semana: core.semana || null,
      pilar_id: core.pilarId === NONE ? null : core.pilarId,
      mecanismo_id: core.mecanismoId === NONE ? null : core.mecanismoId,
      con_ask: core.conAsk,
      lead_magnet: core.leadMagnet || null,
      hipotesis_id: core.hipotesisId === NONE ? null : core.hipotesisId,
      estado: core.estado,
      fecha_programada: core.fechaProgramada || null,
      titulo: core.titulo.trim(),
      descripcion: core.descripcion || null,
      channel_fields: channelFields,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear la pieza'); return; }
    toast.success('Pieza creada');
    onCreated(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva pieza — {CHANNEL_LABELS[channel]}</DialogTitle></DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Título *</Label>
              <Input value={core.titulo} onChange={(e) => updCore('titulo', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fase</Label>
              <Select value={core.fase} onValueChange={(v) => updCore('fase', v)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Semana</Label>
              <Input value={core.semana} onChange={(e) => updCore('semana', e.target.value)} className="bg-secondary/50 mt-1" placeholder="S1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pilar</Label>
              <Select value={core.pilarId} onValueChange={(v) => updCore('pilarId', v)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mecanismo</Label>
              <Select value={core.mecanismoId} onValueChange={(v) => updCore('mecanismoId', v)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {mechanisms.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={core.estado} onValueChange={(v) => updCore('estado', v)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha programada</Label>
              <Input type="date" value={core.fechaProgramada} onChange={(e) => updCore('fechaProgramada', e.target.value)} className="bg-secondary/50 mt-1" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox checked={core.conAsk} onCheckedChange={(v) => updCore('conAsk', !!v)} id="con_ask" />
              <Label htmlFor="con_ask" className="text-sm cursor-pointer">Con ask</Label>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lead magnet</Label>
              <Input value={core.leadMagnet} onChange={(e) => updCore('leadMagnet', e.target.value)} className="bg-secondary/50 mt-1" placeholder="Opcional" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hipótesis vinculada</Label>
              <Select value={core.hipotesisId} onValueChange={(v) => updCore('hipotesisId', v)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {channelHypotheses.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.id} — {(h.hipotesis_texto ?? '').slice(0, 30)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <Textarea rows={2} value={core.descripcion} onChange={(e) => updCore('descripcion', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
            </div>
          </div>

          <div className="border-t border-border/40 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Campos de {CHANNEL_LABELS[channel]}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={cn(f.type === 'boolean' && 'flex items-center gap-2 pt-5')}>
                  {f.type === 'boolean' ? (
                    <>
                      <Checkbox
                        checked={extra[f.key] === true}
                        onCheckedChange={(v) => updExtra(f.key, !!v)}
                        id={f.key}
                      />
                      <Label htmlFor={f.key} className="text-sm cursor-pointer">{f.label}</Label>
                    </>
                  ) : (
                    <>
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      <Input
                        value={typeof extra[f.key] === 'string' ? extra[f.key] as string : ''}
                        onChange={(e) => updExtra(f.key, e.target.value)}
                        className="bg-secondary/50 mt-1"
                        placeholder={f.type === 'url' ? 'https://...' : undefined}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !core.titulo.trim()} className="bg-primary">
            {saving ? 'Guardando…' : 'Crear pieza'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel table ──────────────────────────────────────────────────────────

function ChannelTable({ channel, items, clientId, pillars, mechanisms, hypotheses, refetch }: {
  channel: Channel;
  items: ContentCalendarItem[];
  clientId: string | null;
  pillars: ContenidoTabProps['pillars'];
  mechanisms: ContenidoTabProps['mechanisms'];
  hypotheses: ContenidoTabProps['hypotheses'];
  refetch: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState(ALL);
  const [faseFilter, setFaseFilter] = useState(ALL);

  const pillarById = new Map(pillars.map((p) => [p.id, p]));
  const mechanismById = new Map(mechanisms.map((m) => [m.id, m.nombre]));
  const channelHypotheses = hypotheses.filter((h) => h.channel === channel);

  const filtered = items.filter((it) =>
    (estadoFilter === ALL || it.estado === estadoFilter) &&
    (faseFilter === ALL || it.fase === faseFilter),
  );
  const sorted = [...filtered].sort((a, b) => (a.fecha_programada ?? '9999').localeCompare(b.fecha_programada ?? '9999'));

  const fields = CHANNEL_FIELDS[channel];

  async function updateEstado(item: ContentCalendarItem, estado: string) {
    const { error } = await supabase.from('content_calendar').update({ estado, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) { toast.error('Error al actualizar el estado'); return; }
    await refetch();
  }
  async function updateHipotesis(item: ContentCalendarItem, hipotesisId: string) {
    const { error } = await supabase.from('content_calendar').update({ hipotesis_id: hipotesisId === NONE ? null : hipotesisId, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) { toast.error('Error al vincular la hipótesis'); return; }
    await refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-44 h-8 bg-secondary/50 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={faseFilter} onValueChange={setFaseFilter}>
          <SelectTrigger className="w-36 h-8 bg-secondary/50 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las fases</SelectItem>
            {FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setAdding(true)} className="bg-primary h-8 text-xs px-2 ml-auto">
          <Plus className="h-3.5 w-3.5 mr-1" />Nueva pieza
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {CHANNEL_LABELS[channel]} ({sorted.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs whitespace-nowrap">Fecha</TableHead>
                <TableHead className="text-xs">Título</TableHead>
                <TableHead className="text-xs">Fase / Semana</TableHead>
                <TableHead className="text-xs">Pilar</TableHead>
                <TableHead className="text-xs">Mecanismo</TableHead>
                <TableHead className="text-xs text-center">Ask</TableHead>
                <TableHead className="text-xs">Lead magnet</TableHead>
                <TableHead className="text-xs">Hipótesis</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                {fields.map((f) => <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item) => {
                const pilar = item.pilar_id ? pillarById.get(item.pilar_id) : null;
                const style = pilar ? pillarStyle(pilar.nombre) : null;
                const cf = (item.channel_fields ?? {}) as Record<string, unknown>;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(item.fecha_programada)}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[180px]">
                      <p className="truncate" title={item.titulo ?? ''}>{item.titulo ?? '—'}</p>
                      {item.descripcion && <p className="text-xs text-muted-foreground truncate" title={item.descripcion}>{item.descripcion}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.fase ?? '—'} {item.semana ? `/ ${item.semana}` : ''}</TableCell>
                    <TableCell>
                      {pilar ? <Badge className={cn('text-xs border-0', style!.badge)}>{pilar.nombre}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.mecanismo_id ? mechanismById.get(item.mecanismo_id) ?? '—' : '—'}</TableCell>
                    <TableCell className="text-center"><BoolCell value={item.con_ask} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={item.lead_magnet ?? ''}>{item.lead_magnet ?? '—'}</TableCell>
                    <TableCell>
                      <Select value={item.hipotesis_id ?? NONE} onValueChange={(v) => updateHipotesis(item, v)}>
                        <SelectTrigger className="h-7 w-[100px] bg-secondary/50 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {channelHypotheses.map((h) => <SelectItem key={h.id} value={h.id}>{h.id}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={item.estado} onValueChange={(v) => updateEstado(item, v)}>
                        <SelectTrigger className={cn('h-7 w-[150px] text-xs border-0', ESTADO_BADGE[item.estado] ?? 'bg-secondary')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {fields.map((f) => (
                      <TableCell key={f.key} className="text-xs">
                        {f.type === 'url' ? <LinkCell url={cf[f.key]} />
                          : f.type === 'boolean' ? <BoolCell value={cf[f.key]} />
                          : <span className="text-muted-foreground max-w-[140px] truncate block" title={typeof cf[f.key] === 'string' ? cf[f.key] as string : ''}>{typeof cf[f.key] === 'string' && cf[f.key] ? cf[f.key] as string : '—'}</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={9 + fields.length} className="text-center py-8 text-muted-foreground text-sm">Sin piezas registradas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adding && (
        <NewPieceDialog
          channel={channel}
          clientId={clientId}
          pillars={pillars}
          mechanisms={mechanisms}
          hypotheses={hypotheses}
          onClose={() => setAdding(false)}
          onCreated={refetch}
        />
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabCalendario({ clientId, channelFilter, pillars, mechanisms, hypotheses, calendar, loading, refetch }: ContenidoTabProps) {
  const [activeChannel, setActiveChannel] = useState<Channel>(
    () => (channelFilter === ALL_CHANNELS ? 'youtube' : channelFilter),
  );

  if (loading) {
    return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;
  }

  return (
    <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as Channel)} className="space-y-4">
      <TabsList className="bg-secondary/50">
        {CHANNELS.map((c) => (
          <TabsTrigger key={c} value={c} className="text-sm">{CHANNEL_LABELS[c]}</TabsTrigger>
        ))}
      </TabsList>

      {CHANNELS.map((c) => (
        <TabsContent key={c} value={c}>
          <ChannelTable
            channel={c}
            items={calendar.filter((it) => it.channel === c)}
            clientId={clientId}
            pillars={pillars}
            mechanisms={mechanisms}
            hypotheses={hypotheses}
            refetch={refetch}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
