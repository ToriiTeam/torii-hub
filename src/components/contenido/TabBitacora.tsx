import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Save, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ALL_CHANNELS, CHANNELS, CHANNEL_LABELS,
  type Channel, type ContenidoTabProps, type ContentHypothesis,
} from './types';
import { pillarStyle } from './pillarStyle';

const NONE = 'none';
const ALL = 'all';
const FASES = ['Fase 0', 'Fase 1', 'Fase 2'] as const;
const VEREDICTOS = ['Confirmada', 'Refutada', 'Inconcluso'] as const;
const DECISIONES = ['Repetir', 'Escalar', 'Iterar', 'Descartar'] as const;

function fmtNum(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('es');
}

// ─── NewHypothesisDialog ────────────────────────────────────────────────────

function NewHypothesisDialog({ clientId, pillars, mechanisms, onClose, onCreated }: {
  clientId: string | null;
  pillars: ContenidoTabProps['pillars'];
  mechanisms: ContenidoTabProps['mechanisms'];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    channel: NONE, fase: NONE, semana: '', pilarId: NONE, mecanismoId: NONE,
    hipotesisTexto: '', metricaObjetivo: '', baseline: '', prediccion: '',
  });
  const [saving, setSaving] = useState(false);

  function upd<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.hipotesisTexto.trim()) { toast.error('La hipótesis es requerida'); return; }
    setSaving(true);
    const { error } = await supabase.from('content_hypotheses').insert({
      client_id: clientId,
      channel: form.channel === NONE ? null : form.channel,
      fase: form.fase === NONE ? null : form.fase,
      semana: form.semana || null,
      pilar_id: form.pilarId === NONE ? null : form.pilarId,
      mecanismo_id: form.mecanismoId === NONE ? null : form.mecanismoId,
      hipotesis_texto: form.hipotesisTexto.trim(),
      metrica_objetivo: form.metricaObjetivo || null,
      baseline: form.baseline ? parseFloat(form.baseline) : null,
      prediccion: form.prediccion ? parseFloat(form.prediccion) : null,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear la hipótesis'); return; }
    toast.success('Hipótesis creada');
    onCreated(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva hipótesis</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">El ID (H-00X) se genera automáticamente al guardar.</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Canal</Label>
            <Select value={form.channel} onValueChange={(v) => upd('channel', v)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fase</Label>
            <Select value={form.fase} onValueChange={(v) => upd('fase', v)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Semana</Label>
            <Input value={form.semana} onChange={(e) => upd('semana', e.target.value)} className="bg-secondary/50 mt-1" placeholder="S1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Métrica objetivo</Label>
            <Input value={form.metricaObjetivo} onChange={(e) => upd('metricaObjetivo', e.target.value)} className="bg-secondary/50 mt-1" placeholder="Ej: CTR" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pilar</Label>
            <Select value={form.pilarId} onValueChange={(v) => upd('pilarId', v)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Mecanismo</Label>
            <Select value={form.mecanismoId} onValueChange={(v) => upd('mecanismoId', v)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {mechanisms.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Hipótesis</Label>
            <Textarea
              rows={3}
              value={form.hipotesisTexto}
              onChange={(e) => upd('hipotesisTexto', e.target.value)}
              className="bg-secondary/50 mt-1 resize-none"
              placeholder="Si... entonces... porque..."
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Baseline (opcional)</Label>
            <Input type="number" value={form.baseline} onChange={(e) => upd('baseline', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Predicción</Label>
            <Input type="number" value={form.prediccion} onChange={(e) => upd('prediccion', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !form.hipotesisTexto.trim()} className="bg-primary">
            {saving ? 'Guardando…' : 'Crear hipótesis'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── DetailSheet (proxima_hipotesis_id, aprendizaje, piezas_vinculadas) ────

function DetailSheet({ hypothesis, allHypotheses, onClose, onSaved }: {
  hypothesis: ContentHypothesis;
  allHypotheses: ContentHypothesis[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [aprendizaje, setAprendizaje] = useState(hypothesis.aprendizaje ?? '');
  const [piezas, setPiezas] = useState(hypothesis.piezas_vinculadas ?? '');
  const [proximaId, setProximaId] = useState(hypothesis.proxima_hipotesis_id ?? NONE);
  const [saving, setSaving] = useState(false);

  const candidates = allHypotheses.filter((h) => h.id !== hypothesis.id);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('content_hypotheses').update({
      aprendizaje: aprendizaje || null,
      piezas_vinculadas: piezas || null,
      proxima_hipotesis_id: proximaId === NONE ? null : proximaId,
      updated_at: new Date().toISOString(),
    }).eq('id', hypothesis.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Guardado');
    onSaved();
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="bg-card border-border overflow-y-auto w-full sm:max-w-md">
        <SheetHeader><SheetTitle>{hypothesis.id}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Hipótesis</Label>
            <p className="text-sm mt-1 leading-relaxed">{hypothesis.hipotesis_texto}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Aprendizaje</Label>
            <Textarea rows={3} value={aprendizaje} onChange={(e) => setAprendizaje(e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Piezas vinculadas</Label>
            <Textarea rows={2} value={piezas} onChange={(e) => setPiezas(e.target.value)} className="bg-secondary/50 mt-1 resize-none" placeholder="Referencia libre a las piezas del calendario relacionadas..." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Próxima hipótesis</Label>
            <Select value={proximaId} onValueChange={setProximaId}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {candidates.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.id} — {(h.hipotesis_texto ?? '').slice(0, 40)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabBitacora({ clientId, channelFilter, pillars, mechanisms, hypotheses, loading, refetch }: ContenidoTabProps) {
  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [veredictoFilter, setVeredictoFilter] = useState(ALL);
  const [pilarFilter, setPilarFilter] = useState(ALL);

  // Inline-edit drafts, keyed by hypothesis id.
  const [resultadoDraft, setResultadoDraft] = useState<Record<string, string>>({});
  const [aprendizajeDraft, setAprendizajeDraft] = useState<Record<string, string>>({});

  const pillarById = new Map(pillars.map((p) => [p.id, p]));
  const mechanismById = new Map(mechanisms.map((m) => [m.id, m.nombre]));

  const filtered = hypotheses.filter((h) =>
    (channelFilter === ALL_CHANNELS || h.channel === channelFilter) &&
    (veredictoFilter === ALL || (veredictoFilter === NONE ? !h.veredicto : h.veredicto === veredictoFilter)) &&
    (pilarFilter === ALL || h.pilar_id === pilarFilter),
  );
  const sorted = [...filtered].sort((a, b) => b.id.localeCompare(a.id));

  function draftResultado(h: ContentHypothesis): string {
    return resultadoDraft[h.id] ?? (h.resultado_real != null ? String(h.resultado_real) : '');
  }
  function draftAprendizaje(h: ContentHypothesis): string {
    return aprendizajeDraft[h.id] ?? (h.aprendizaje ?? '');
  }

  async function saveResultado(h: ContentHypothesis) {
    const raw = draftResultado(h).trim();
    const value = raw === '' ? null : parseFloat(raw);
    if (raw !== '' && Number.isNaN(value)) { toast.error('Valor inválido'); return; }
    const { error } = await supabase.from('content_hypotheses')
      .update({ resultado_real: value, updated_at: new Date().toISOString() })
      .eq('id', h.id);
    if (error) { toast.error('Error al guardar el resultado'); return; }
    setResultadoDraft((prev) => { const next = { ...prev }; delete next[h.id]; return next; });
    await refetch();
  }

  async function saveAprendizaje(h: ContentHypothesis) {
    const value = draftAprendizaje(h).trim();
    const { error } = await supabase.from('content_hypotheses')
      .update({ aprendizaje: value || null, updated_at: new Date().toISOString() })
      .eq('id', h.id);
    if (error) { toast.error('Error al guardar el aprendizaje'); return; }
    setAprendizajeDraft((prev) => { const next = { ...prev }; delete next[h.id]; return next; });
    await refetch();
  }

  async function updateField(h: ContentHypothesis, field: 'veredicto' | 'decision', value: string) {
    const { error } = await supabase.from('content_hypotheses')
      .update({ [field]: value === NONE ? null : value, updated_at: new Date().toISOString() })
      .eq('id', h.id);
    if (error) { toast.error('Error al actualizar'); return; }
    await refetch();
  }

  const detailHypothesis = detailId ? hypotheses.find((h) => h.id === detailId) ?? null : null;

  if (loading) {
    return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={veredictoFilter} onValueChange={setVeredictoFilter}>
          <SelectTrigger className="w-44 h-8 bg-secondary/50 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los veredictos</SelectItem>
            <SelectItem value={NONE}>Sin veredicto</SelectItem>
            {VEREDICTOS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pilarFilter} onValueChange={setPilarFilter}>
          <SelectTrigger className="w-44 h-8 bg-secondary/50 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los pilares</SelectItem>
            {pillars.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setAdding(true)} className="bg-primary h-8 text-xs px-2 ml-auto">
          <Plus className="h-3.5 w-3.5 mr-1" />Nueva hipótesis
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Bitácora de hipótesis ({sorted.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Canal</TableHead>
                <TableHead className="text-xs">Fase / Semana</TableHead>
                <TableHead className="text-xs">Pilar</TableHead>
                <TableHead className="text-xs">Mecanismo</TableHead>
                <TableHead className="text-xs">Hipótesis</TableHead>
                <TableHead className="text-xs text-right">Predicción</TableHead>
                <TableHead className="text-xs text-right">Resultado real</TableHead>
                <TableHead className="text-xs text-right">Δ</TableHead>
                <TableHead className="text-xs text-right">% cumpl.</TableHead>
                <TableHead className="text-xs">Veredicto</TableHead>
                <TableHead className="text-xs">Decisión</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((h) => {
                const pilar = h.pilar_id ? pillarById.get(h.pilar_id) : null;
                const style = pilar ? pillarStyle(pilar.nombre) : null;
                const resultadoDirty = draftResultado(h) !== (h.resultado_real != null ? String(h.resultado_real) : '');
                const delta = h.resultado_real != null && h.prediccion != null ? h.resultado_real - h.prediccion : null;
                const pct = h.resultado_real != null && h.prediccion ? h.resultado_real / h.prediccion : null;
                const showAprendizaje = h.resultado_real != null;
                const aprendizajeDirty = draftAprendizaje(h) !== (h.aprendizaje ?? '');

                return (
                  <Fragment key={h.id}>
                    <TableRow>
                      <TableCell className="text-xs font-mono font-medium whitespace-nowrap">{h.id}</TableCell>
                      <TableCell className="text-xs">{h.channel ? CHANNEL_LABELS[h.channel as Channel] : '—'}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{h.fase ?? '—'} {h.semana ? `/ ${h.semana}` : ''}</TableCell>
                      <TableCell>
                        {pilar ? <Badge className={cn('text-xs border-0', style!.badge)}>{pilar.nombre}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.mecanismo_id ? mechanismById.get(h.mecanismo_id) ?? '—' : '—'}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <UiTooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs truncate cursor-default">{h.hipotesis_texto ?? '—'}</p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{h.hipotesis_texto}</TooltipContent>
                        </UiTooltip>
                      </TableCell>
                      <TableCell className="text-xs text-right">{fmtNum(h.prediccion)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            value={draftResultado(h)}
                            onChange={(e) => setResultadoDraft((prev) => ({ ...prev, [h.id]: e.target.value }))}
                            className="bg-secondary/50 h-7 w-20 text-xs text-right"
                          />
                          {resultadoDirty && (
                            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => saveResultado(h)}>
                              <Save className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn('text-xs text-right', delta == null ? 'text-muted-foreground' : delta >= 0 ? 'text-success' : 'text-destructive')}>
                        {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toLocaleString('es')}`}
                      </TableCell>
                      <TableCell className={cn('text-xs text-right', pct == null ? 'text-muted-foreground' : pct >= 1 ? 'text-success' : 'text-warning')}>
                        {pct == null ? '—' : `${Math.round(pct * 100)}%`}
                      </TableCell>
                      <TableCell>
                        <Select value={h.veredicto ?? NONE} onValueChange={(v) => updateField(h, 'veredicto', v)}>
                          <SelectTrigger className="h-7 w-[120px] bg-secondary/50 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {VEREDICTOS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={h.decision ?? NONE} onValueChange={(v) => updateField(h, 'decision', v)}>
                          <SelectTrigger className="h-7 w-[110px] bg-secondary/50 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>—</SelectItem>
                            {DECISIONES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(h.id)} title="Ver detalle / próxima hipótesis">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {showAprendizaje && (
                      <TableRow className="bg-secondary/10">
                        <TableCell colSpan={13} className="py-2">
                          <div className="flex items-start gap-2 pl-1">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
                            <div className="flex-1">
                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Aprendizaje</Label>
                              <Textarea
                                rows={1}
                                value={draftAprendizaje(h)}
                                onChange={(e) => setAprendizajeDraft((prev) => ({ ...prev, [h.id]: e.target.value }))}
                                className="bg-secondary/50 mt-1 resize-none text-xs"
                                placeholder="Qué aprendimos de esta tanda..."
                              />
                            </div>
                            {aprendizajeDirty && (
                              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 mt-5" onClick={() => saveAprendizaje(h)}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground text-sm">Sin hipótesis registradas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adding && (
        <NewHypothesisDialog
          clientId={clientId}
          pillars={pillars}
          mechanisms={mechanisms}
          onClose={() => setAdding(false)}
          onCreated={refetch}
        />
      )}

      {detailHypothesis && (
        <DetailSheet
          hypothesis={detailHypothesis}
          allHypotheses={hypotheses}
          onClose={() => setDetailId(null)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
