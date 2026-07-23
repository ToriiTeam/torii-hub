import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Youtube, Instagram, Linkedin, ArrowRight, Save, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_CHANNELS, CHANNELS, CHANNEL_LABELS, type Channel, type ContenidoTabProps, type ContentPhaseGate } from './types';

const PHASES = ['Fase 0', 'Fase 1', 'Fase 2'] as const;
type Phase = typeof PHASES[number];

const CHANNEL_ICON: Record<Channel, React.ElementType> = {
  youtube: Youtube, instagram: Instagram, linkedin: Linkedin,
};

type GateStatus = 'pendiente' | 'cumplido' | 'no_cumplido';

// Always derived, never persisted — same reasoning as
// content_hypotheses.delta/content_metrics_tanda's ratios: a persisted
// `status` could drift out of sync with current_value/threshold_value/
// direction (e.g. if current_value is edited anywhere outside this one
// save handler), so it's recomputed from the raw numbers every render
// instead. The `status` DB column stays untouched at its 'pendiente'
// default — same "leave it as inert backup" call as client_hypotheses.
function computeGateStatus(gate: ContentPhaseGate): GateStatus {
  if (gate.current_value == null) return 'pendiente';
  const cur = Number(gate.current_value);
  const thr = Number(gate.threshold_value);
  const met = gate.direction === '>=' ? cur >= thr : cur <= thr;
  return met ? 'cumplido' : 'no_cumplido';
}

const STATUS_CONFIG: Record<GateStatus, { label: string; className: string; icon: React.ElementType }> = {
  pendiente:   { label: 'Pendiente',   className: 'bg-secondary text-muted-foreground', icon: Circle },
  cumplido:    { label: 'Cumplido',    className: 'bg-success/20 text-success',          icon: CheckCircle2 },
  no_cumplido: { label: 'No cumplido', className: 'bg-destructive/20 text-destructive',  icon: XCircle },
};

function GateStatusBadge({ status }: { status: GateStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge className={cn('text-xs border-0 gap-1', cfg.className)}>
      <Icon className="h-3 w-3" />{cfg.label}
    </Badge>
  );
}

// ─── Phase status card (per channel) ───────────────────────────────────────

function PhaseStatusCard({ channel, currentPhase, statusRowId, clientId, onSaved }: {
  channel: Channel;
  currentPhase: Phase | null;
  statusRowId: string | null;
  clientId: string | null;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const Icon = CHANNEL_ICON[channel];

  async function handlePhaseChange(newPhase: string) {
    setSaving(true);
    const { error } = statusRowId
      ? await supabase.from('content_phase_status').update({ current_phase: newPhase, updated_at: new Date().toISOString() }).eq('id', statusRowId)
      : await supabase.from('content_phase_status').insert({ client_id: clientId, channel, current_phase: newPhase });
    setSaving(false);
    if (error) { toast.error('Error al actualizar la fase'); return; }
    toast.success('Fase actualizada');
    await onSaved();
  }

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{CHANNEL_LABELS[channel]}</span>
        </div>
        <Badge className="text-base font-bold border-0 bg-primary/20 text-primary px-3 py-1">
          {currentPhase ?? 'Sin datos'}
        </Badge>
        <Select value={currentPhase ?? ''} onValueChange={handlePhaseChange} disabled={saving}>
          <SelectTrigger className="bg-secondary/50 h-8 text-xs"><SelectValue placeholder="Cambiar fase" /></SelectTrigger>
          <SelectContent>
            {PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

// ─── Gate row ───────────────────────────────────────────────────────────────

function GateRow({ gate, onSaved }: { gate: ContentPhaseGate; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(gate.current_value != null ? String(gate.current_value) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(gate.current_value != null ? String(gate.current_value) : '');
  }, [gate.current_value]);

  const dirty = draft !== (gate.current_value != null ? String(gate.current_value) : '');
  const status = computeGateStatus(gate);

  async function handleSave() {
    const value = draft.trim() === '' ? null : parseFloat(draft);
    if (draft.trim() !== '' && Number.isNaN(value)) { toast.error('Valor inválido'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('content_phase_gates')
      .update({ current_value: value, updated_at: new Date().toISOString() })
      .eq('id', gate.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar el valor'); return; }
    await onSaved();
  }

  return (
    <div className="grid grid-cols-12 gap-3 items-center py-2.5 border-b border-border/30 last:border-0">
      <div className="col-span-4">
        <p className="text-sm font-medium">{gate.metric_name}</p>
        {gate.note && <p className="text-xs text-muted-foreground">{gate.note}</p>}
      </div>
      <div className="col-span-2 text-sm text-muted-foreground text-center">
        {gate.direction} {gate.threshold_value}
      </div>
      <div className="col-span-3 flex items-center gap-1.5">
        <Input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="bg-secondary/50 h-8 text-sm"
          placeholder="Valor actual"
        />
        {dirty && (
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="col-span-3">
        <GateStatusBadge status={status} />
      </div>
    </div>
  );
}

// ─── Gate block (Fase X → Fase Y) ───────────────────────────────────────────

function GateBlock({ fromPhase, toPhase, gates, onSaved }: {
  fromPhase: string; toPhase: string; gates: ContentPhaseGate[]; onSaved: () => Promise<void>;
}) {
  const statuses = gates.map(computeGateStatus);
  const ready = gates.length > 0 && statuses.every((s) => s === 'cumplido');
  const missing = statuses.filter((s) => s !== 'cumplido').length;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {fromPhase} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {toPhase}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-12 gap-3 text-xs text-muted-foreground uppercase tracking-wide pb-2 border-b border-border/40">
          <div className="col-span-4">Métrica</div>
          <div className="col-span-2 text-center">Objetivo</div>
          <div className="col-span-3">Valor actual</div>
          <div className="col-span-3">Estado</div>
        </div>
        {gates.map((g) => <GateRow key={g.id} gate={g} onSaved={onSaved} />)}
        {gates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sin gatillos definidos.</p>
        )}

        <div className={cn(
          'mt-4 rounded-md px-3 py-2.5 text-sm font-medium flex items-center justify-between',
          ready ? 'bg-success/10 text-success' : 'bg-secondary/40 text-muted-foreground',
        )}>
          <span>¿Listo para saltar de fase?</span>
          <span>{ready ? 'Sí' : `Faltan ${missing} gatillo${missing === 1 ? '' : 's'}`}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabFases({ clientId, channelFilter, phaseStatus, phaseGates, loading, refetch }: ContenidoTabProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-lg bg-secondary/40" />)}
        </div>
        <div className="h-64 rounded-lg bg-secondary/40" />
      </div>
    );
  }

  const visibleChannels: Channel[] = channelFilter === ALL_CHANNELS ? CHANNELS : [channelFilter];

  // General gates (channel=null) apply regardless of channel filter — they
  // only get excluded if a channel-specific gate exists for a *different*
  // channel than the one currently selected.
  const visibleGates = phaseGates.filter(
    (g) => g.channel === null || channelFilter === ALL_CHANNELS || g.channel === channelFilter,
  );

  const blocks: { fromPhase: string; toPhase: string; gates: ContentPhaseGate[] }[] = [];
  for (const gate of visibleGates) {
    const from = gate.from_phase ?? '—';
    const to = gate.to_phase ?? '—';
    let block = blocks.find((b) => b.fromPhase === from && b.toPhase === to);
    if (!block) { block = { fromPhase: from, toPhase: to, gates: [] }; blocks.push(block); }
    block.gates.push(gate);
  }
  blocks.sort((a, b) => PHASES.indexOf(a.fromPhase as Phase) - PHASES.indexOf(b.fromPhase as Phase));

  return (
    <div className="space-y-6">
      <div className={cn('grid gap-4', visibleChannels.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-3')}>
        {visibleChannels.map((channel) => {
          const row = phaseStatus.find((s) => s.channel === channel);
          return (
            <PhaseStatusCard
              key={channel}
              channel={channel}
              currentPhase={(row?.current_phase as Phase | undefined) ?? null}
              statusRowId={row?.id ?? null}
              clientId={clientId}
              onSaved={refetch}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {blocks.map((b) => (
          <GateBlock key={`${b.fromPhase}-${b.toPhase}`} fromPhase={b.fromPhase} toPhase={b.toPhase} gates={b.gates} onSaved={refetch} />
        ))}
        {blocks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 col-span-full">Sin gatillos de fase definidos.</p>
        )}
      </div>
    </div>
  );
}
