import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, Loader2, Phone, Repeat, Rocket, ClipboardCheck,
  ExternalLink, ArrowRight, Clock, XCircle, PhoneCall,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmCall {
  id: string;
  client_id: string;
  fecha: string | null;
  tipo: string | null;
  duracion_minutos: number | null;
  asistio: boolean;
  sentiment: string | null;
  resultado: string | null;
  proxima_accion: string | null;
  link: string | null;
  notas: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS = [
  { value: 'call_estrategica', label: 'Call estratégica', icon: Phone },
  { value: 'seguimiento',      label: 'Seguimiento',       icon: Repeat },
  { value: 'onboarding',       label: 'Onboarding',        icon: Rocket },
  { value: 'revision',         label: 'Revisión',          icon: ClipboardCheck },
];

const SENTIMENTS = [
  { value: 'positivo', label: 'Positivo' },
  { value: 'neutro',   label: 'Neutro' },
  { value: 'negativo', label: 'Negativo' },
];

const sentimentStyle: Record<string, string> = {
  positivo: 'bg-success/20 text-success',
  neutro:   'bg-secondary text-muted-foreground',
  negativo: 'bg-destructive/20 text-destructive',
};

const emptyForm = {
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'call_estrategica',
  duracion_minutos: '',
  asistio: true,
  sentiment: 'neutro',
  resultado: '',
  proxima_accion: '',
  link: '',
  notas: '',
};

type FormState = typeof emptyForm;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tipoMeta(tipo: string | null) {
  return TIPOS.find(t => t.value === tipo) ?? { value: tipo ?? '', label: tipo ?? 'Sin tipo', icon: PhoneCall };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  try {
    const parsed = parseISO(d);
    return isValid(parsed) ? format(parsed, "d MMM yyyy", { locale: es }) : '—';
  } catch { return '—'; }
}

function driveOrUrl(link: string) {
  return link.startsWith('http') ? link : `https://${link}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

export default function TabCRMCalls({ clientId }: Props) {
  const [calls, setCalls] = useState<CrmCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_crm_calls')
      .select('*')
      .eq('client_id', clientId)
      .order('fecha', { ascending: false });
    if (error) toast.error('Error al cargar llamadas');
    else setCalls((data ?? []) as CrmCall[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const handleCreate = async () => {
    if (!form.fecha) { toast.error('La fecha es requerida'); return; }
    setSaving(true);
    const { error } = await supabase.from('client_crm_calls').insert({
      client_id:        clientId,
      fecha:            form.fecha,
      tipo:             form.tipo,
      duracion_minutos: form.duracion_minutos ? parseInt(form.duracion_minutos, 10) : null,
      asistio:          form.asistio,
      sentiment:        form.sentiment,
      resultado:        form.resultado || null,
      proxima_accion:   form.proxima_accion || null,
      link:             form.link || null,
      notas:            form.notas || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al registrar llamada'); return; }
    toast.success('Llamada registrada');
    setDialogOpen(false);
    setForm(emptyForm);
    fetchCalls();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      {/* ── New call dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setForm(emptyForm); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nueva llamada</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="bg-secondary/50 mt-1"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duración (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.duracion_minutos}
                  onChange={e => setForm({ ...form, duracion_minutos: e.target.value })}
                  className="bg-secondary/50 mt-1"
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Sentiment</Label>
                <Select value={form.sentiment} onValueChange={v => setForm({ ...form, sentiment: v })}>
                  <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENTIMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
              <Label className="cursor-pointer">¿El cliente asistió?</Label>
              <Switch checked={form.asistio} onCheckedChange={v => setForm({ ...form, asistio: v })} />
            </div>
            <div>
              <Label>Resultado</Label>
              <Textarea
                value={form.resultado}
                onChange={e => setForm({ ...form, resultado: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={2}
                placeholder="Qué se trató, decisiones tomadas..."
              />
            </div>
            <div>
              <Label>Próxima acción</Label>
              <Input
                value={form.proxima_accion}
                onChange={e => setForm({ ...form, proxima_accion: e.target.value })}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: Enviar propuesta de nuevo ángulo"
              />
            </div>
            <div>
              <Label>Link (grabación o doc)</Label>
              <Input
                value={form.link}
                onChange={e => setForm({ ...form, link: e.target.value })}
                className="bg-secondary/50 mt-1 font-mono text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Registrar llamada
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            CRM — Llamadas
          </span>
          <Badge variant="outline" className="text-xs">{calls.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Nueva llamada
        </Button>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      {calls.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
          No hay llamadas registradas todavía
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />
          <div className="space-y-4">
            {calls.map(call => {
              const meta = tipoMeta(call.tipo);
              const Icon = meta.icon;
              return (
                <div key={call.id} className="relative">
                  <div className={cn(
                    'absolute -left-6 top-3 h-3.5 w-3.5 rounded-full border-2 border-background',
                    call.asistio ? 'bg-primary' : 'bg-muted-foreground'
                  )} />
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{meta.label}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(call.fecha)}</span>
                          {call.duracion_minutos != null && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />{call.duracion_minutos} min
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!call.asistio && (
                            <Badge className="bg-destructive/20 text-destructive border-0 text-xs gap-1">
                              <XCircle className="h-3 w-3" />No asistió
                            </Badge>
                          )}
                          {call.sentiment && (
                            <Badge className={cn('border-0 text-xs', sentimentStyle[call.sentiment] ?? '')}>
                              {SENTIMENTS.find(s => s.value === call.sentiment)?.label ?? call.sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {call.resultado && (
                        <p className="text-sm text-foreground/90">{call.resultado}</p>
                      )}

                      {call.proxima_accion && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary/30 rounded px-2 py-1.5">
                          <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span><span className="font-medium text-foreground/80">Próximo paso:</span> {call.proxima_accion}</span>
                        </div>
                      )}

                      {call.notas && (
                        <p className="text-xs text-muted-foreground italic">{call.notas}</p>
                      )}

                      {call.link && (
                        <button
                          onClick={() => window.open(driveOrUrl(call.link!), '_blank', 'noopener,noreferrer')}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />Abrir grabación / doc
                        </button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
