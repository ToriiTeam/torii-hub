import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ALL_CHANNELS, CHANNELS, CHANNEL_LABELS,
  type Channel, type ContenidoTabProps, type ContentMetricsTanda,
} from './types';

const FASES = ['Fase 0', 'Fase 1', 'Fase 2'] as const;

const RAW_FIELDS = [
  { key: 'piezas_publicadas', label: 'Piezas' },
  { key: 'alcance', label: 'Alcance' },
  { key: 'interacciones', label: 'Interacciones' },
  { key: 'comentarios_keyword', label: 'Coment. keyword' },
  { key: 'dms_iniciados', label: 'DMs iniciados' },
  { key: 'leads_capturados', label: 'Leads' },
  { key: 'reservas', label: 'Reservas' },
  { key: 'llamadas', label: 'Llamadas' },
  { key: 'cierres', label: 'Cierres' },
  { key: 'coste', label: 'Coste' },
] as const;
type RawField = typeof RAW_FIELDS[number]['key'];

function safeDiv(num: number, den: number): number | null {
  return den ? num / den : null;
}

interface RawTotals {
  comentarios_keyword: number; dms_iniciados: number; leads_capturados: number; reservas: number; coste: number;
}

function computeRatios(m: RawTotals) {
  return {
    comDm: safeDiv(m.dms_iniciados, m.comentarios_keyword),
    dmLead: safeDiv(m.leads_capturados, m.dms_iniciados),
    leadReserva: safeDiv(m.reservas, m.leads_capturados),
    cpl: safeDiv(m.coste, m.leads_capturados),
  };
}

function fmtPct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}
function fmtMoney(v: number | null): string {
  return v == null ? '—' : `$${v.toLocaleString('es', { maximumFractionDigits: 2 })}`;
}

// ─── Editable number cell — local draft, saves on blur ─────────────────────

function EditableNumberCell({ value, onSave }: { value: number; onSave: (v: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(String(value)), [value]);

  async function handleBlur() {
    const trimmed = draft.trim();
    const parsed = trimmed === '' ? 0 : parseFloat(trimmed);
    if (Number.isNaN(parsed)) { toast.error('Valor inválido'); setDraft(String(value)); return; }
    if (parsed === value) return;
    setSaving(true);
    await onSave(parsed);
    setSaving(false);
  }

  return (
    <Input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      disabled={saving}
      className="bg-secondary/50 h-7 w-20 text-xs"
    />
  );
}

// ─── NewTandaDialog ─────────────────────────────────────────────────────────

function NewTandaDialog({ clientId, defaultChannel, onClose, onCreated }: {
  clientId: string | null;
  defaultChannel: Channel;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [semana, setSemana] = useState('');
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [fase, setFase] = useState<string>(FASES[0]);
  const [raw, setRaw] = useState<Record<RawField, string>>({
    piezas_publicadas: '0', alcance: '0', interacciones: '0', comentarios_keyword: '0',
    dms_iniciados: '0', leads_capturados: '0', reservas: '0', llamadas: '0', cierres: '0', coste: '0',
  });
  const [saving, setSaving] = useState(false);

  function updRaw(key: RawField, value: string) {
    setRaw((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!semana.trim()) { toast.error('La semana es requerida'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      client_id: clientId, semana: semana.trim(), channel, fase,
    };
    for (const f of RAW_FIELDS) {
      const parsed = parseFloat(raw[f.key]);
      payload[f.key] = Number.isNaN(parsed) ? 0 : parsed;
    }
    const { error } = await supabase.from('content_metrics_tanda').insert(payload);
    setSaving(false);
    if (error) { toast.error('Error al crear la tanda'); return; }
    toast.success('Tanda creada');
    onCreated(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva tanda</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Semana *</Label>
            <Input value={semana} onChange={(e) => setSemana(e.target.value)} className="bg-secondary/50 mt-1" placeholder="S1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fase</Label>
            <Select value={fase} onValueChange={setFase}>
              <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {RAW_FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input
                type="number"
                value={raw[f.key]}
                onChange={(e) => updRaw(f.key, e.target.value)}
                className="bg-secondary/50 mt-1"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !semana.trim()} className="bg-primary">
            {saving ? 'Guardando…' : 'Crear tanda'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function TabMetricasTanda({ clientId, channelFilter, metricsTanda, loading, refetch }: ContenidoTabProps) {
  const [adding, setAdding] = useState(false);

  const filtered = channelFilter === ALL_CHANNELS
    ? metricsTanda
    : metricsTanda.filter((m) => m.channel === channelFilter);
  const sorted = [...filtered].sort((a, b) => a.semana.localeCompare(b.semana) || a.channel.localeCompare(b.channel));

  async function updateField(id: string, field: RawField, value: number) {
    const { error } = await supabase.from('content_metrics_tanda')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Error al guardar'); return; }
    await refetch();
  }

  if (loading) {
    return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;
  }

  // Totals: sum numerators and denominators separately across all filtered
  // rows, then divide once — NOT an average of each row's own ratio, which
  // would distort the result (e.g. one tiny-sample row with a 100% ratio
  // shouldn't weigh the same as a row with 10x the volume).
  const totals = filtered.reduce((acc, m) => {
    for (const f of RAW_FIELDS) acc[f.key] += Number(m[f.key]);
    return acc;
  }, Object.fromEntries(RAW_FIELDS.map((f) => [f.key, 0])) as Record<RawField, number>);
  const totalRatios = computeRatios(totals);

  return (
    <div className="space-y-4">

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Totales acumulados {channelFilter !== ALL_CHANNELS ? `— ${CHANNEL_LABELS[channelFilter]}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {RAW_FIELDS.map((f) => (
              <div key={f.key}>
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-lg font-bold">{f.key === 'coste' ? fmtMoney(totals[f.key]) : totals[f.key].toLocaleString('es')}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/40">
            <div><p className="text-xs text-muted-foreground">Com → DM</p><p className="text-base font-semibold">{fmtPct(totalRatios.comDm)}</p></div>
            <div><p className="text-xs text-muted-foreground">DM → Lead</p><p className="text-base font-semibold">{fmtPct(totalRatios.dmLead)}</p></div>
            <div><p className="text-xs text-muted-foreground">Lead → Reserva</p><p className="text-base font-semibold">{fmtPct(totalRatios.leadReserva)}</p></div>
            <div><p className="text-xs text-muted-foreground">CPL</p><p className="text-base font-semibold">{fmtMoney(totalRatios.cpl)}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)} className="bg-primary h-8 text-xs px-2">
          <Plus className="h-3.5 w-3.5 mr-1" />Nueva tanda
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tandas ({sorted.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs whitespace-nowrap">Semana</TableHead>
                <TableHead className="text-xs">Canal</TableHead>
                <TableHead className="text-xs">Fase</TableHead>
                {RAW_FIELDS.map((f) => <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>)}
                <TableHead className="text-xs whitespace-nowrap">Com→DM</TableHead>
                <TableHead className="text-xs whitespace-nowrap">DM→Lead</TableHead>
                <TableHead className="text-xs whitespace-nowrap">Lead→Reserva</TableHead>
                <TableHead className="text-xs whitespace-nowrap">CPL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((m) => {
                const ratios = computeRatios(m as unknown as RawTotals);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs font-medium whitespace-nowrap">{m.semana}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{CHANNEL_LABELS[m.channel as Channel] ?? m.channel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{m.fase ?? '—'}</TableCell>
                    {RAW_FIELDS.map((f) => (
                      <TableCell key={f.key}>
                        <EditableNumberCell
                          value={Number((m as unknown as Record<string, number>)[f.key])}
                          onSave={(v) => updateField(m.id, f.key, v)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className={cn('text-xs', ratios.comDm == null ? 'text-muted-foreground' : '')}>{fmtPct(ratios.comDm)}</TableCell>
                    <TableCell className={cn('text-xs', ratios.dmLead == null ? 'text-muted-foreground' : '')}>{fmtPct(ratios.dmLead)}</TableCell>
                    <TableCell className={cn('text-xs', ratios.leadReserva == null ? 'text-muted-foreground' : '')}>{fmtPct(ratios.leadReserva)}</TableCell>
                    <TableCell className={cn('text-xs', ratios.cpl == null ? 'text-muted-foreground' : '')}>{fmtMoney(ratios.cpl)}</TableCell>
                  </TableRow>
                );
              })}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground text-sm">Sin tandas registradas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {adding && (
        <NewTandaDialog
          clientId={clientId}
          defaultChannel={channelFilter === ALL_CHANNELS ? 'youtube' : channelFilter}
          onClose={() => setAdding(false)}
          onCreated={refetch}
        />
      )}
    </div>
  );
}
