import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { type Client } from '@/pages/ClienteDetalle';
import {
  AlertTriangle,
  ChevronDown, ChevronUp, Plus, MessageSquare,
  Phone, Mail, Video, Users, Activity, Heart,
} from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { StartToriiOSBanner } from './torii-os/StartToriiOSBanner';
import { PhaseTimeline } from './torii-os/PhaseTimeline';
import { CurrentPhaseCard } from './torii-os/CurrentPhaseCard';
import { PhaseChecklistCard } from './torii-os/PhaseChecklistCard';
import { PhaseMetricsCard } from './torii-os/PhaseMetricsCard';
import { PhaseHistoryTable } from './torii-os/PhaseHistoryTable';
import { PhaseHistoryDialog } from './torii-os/PhaseHistoryDialog';
import { fetchClientPhases, fetchChecklist } from '@/features/delivery-os/lib/phasesRepo';
import type { DeliveryPhase, PhaseChecklistItem } from '@/features/delivery-os/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthRecord {
  id: string;
  confianza: number;
  trust: number;
  engagement: number;
  respuesta: number;
  economia: number;
  score_total: number;
  fecha: string;
  notas: string | null;
}

interface Bottleneck {
  id: string;
  codigo: string | null;
  descripcion: string | null;
  hipotesis: string | null;
  test_activo: string | null;
  proxima_decision: string | null;
  fecha_decision: string | null;
}

interface Experience {
  tipo: string;
  fecha: string | null;
  sentiment: string;
  descripcion: string | null;
  link: string | null;
  dias_desde_ultimo_contacto: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const renewalRiskStyle: Record<string, { badge: string; label: string }> = {
  low:    { badge: 'bg-success/20 text-success',     label: 'Riesgo bajo' },
  medium: { badge: 'bg-warning/20 text-warning',     label: 'Riesgo medio' },
  high:   { badge: 'bg-destructive/20 text-destructive', label: 'Riesgo alto' },
};

const sentimentStyle: Record<string, string> = {
  positive: 'bg-success/20 text-success',
  neutral:  'bg-secondary text-muted-foreground',
  negative: 'bg-destructive/20 text-destructive',
};

const sentimentLabel: Record<string, string> = {
  positive: 'Positivo',
  neutral:  'Neutral',
  negative: 'Negativo',
};

const tipoIcon: Record<string, React.ElementType> = {
  loom:             Video,
  call_estrategica: Phone,
  whatsapp:         MessageSquare,
  email:            Mail,
  reunion:          Users,
};

const healthAxes: { key: keyof HealthRecord; label: string }[] = [
  { key: 'confianza',  label: 'Confianza' },
  { key: 'trust',      label: 'Trust' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'respuesta',  label: 'Respuesta' },
  { key: 'economia',   label: 'Economía' },
];

const emptyHealthForm = {
  confianza: '5', trust: '5', engagement: '5', respuesta: '5', economia: '5', notas: '',
};

const emptyBottleneckForm = {
  codigo: '', descripcion: '', hipotesis: '',
  test_activo: '', proxima_decision: '', fecha_decision: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 8) return 'text-success';
  if (score >= 5) return 'text-warning';
  return 'text-destructive';
}

function axisColor(value: number) {
  if (value >= 8) return 'bg-success';
  if (value >= 5) return 'bg-warning';
  return 'bg-destructive';
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? differenceInDays(new Date(), d) : null;
  } catch {
    return null;
  }
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "d MMM yyyy", { locale: es }) : '—';
  } catch {
    return '—';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  client: Client;
  onClientUpdate: () => void;
}

export default function TabFichaOperativa({ client, onClientUpdate }: Props) {
  const [health, setHealth] = useState<HealthRecord | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBottlenecks, setShowAllBottlenecks] = useState(false);

  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [healthForm, setHealthForm] = useState(emptyHealthForm);
  const [savingHealth, setSavingHealth] = useState(false);

  const [bnDialogOpen, setBnDialogOpen] = useState(false);
  const [bnForm, setBnForm] = useState(emptyBottleneckForm);
  const [savingBn, setSavingBn] = useState(false);

  // ── Torii OS (delivery_phases) ──────────────────────────────────────────
  const [currentPhase, setCurrentPhase] = useState<DeliveryPhase | null>(null);
  const [phaseHistory, setPhaseHistory] = useState<DeliveryPhase[]>([]);
  const [checklistItems, setChecklistItems] = useState<PhaseChecklistItem[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);
  const [historyDialogPhase, setHistoryDialogPhase] = useState<DeliveryPhase | null>(null);
  const hasAnyPhase = currentPhase != null || phaseHistory.length > 0;

  const fetchPhases = async () => {
    setLoadingPhases(true);
    try {
      const { current, history } = await fetchClientPhases(client.id);
      setCurrentPhase(current);
      setPhaseHistory(history);
      setChecklistItems(current ? await fetchChecklist(client.id, current.fase) : []);
    } catch (err) {
      console.error('[TabFichaOperativa] failed to load Torii OS phases:', err);
    } finally {
      setLoadingPhases(false);
    }
  };

  useEffect(() => { fetchAll(); fetchPhases(); }, [client.id]);

  const fetchAll = async () => {
    setLoading(true);
    const [healthRes, bnRes, expRes] = await Promise.all([
      supabase
        .from('client_health')
        .select('id, confianza, trust, engagement, respuesta, economia, score_total, fecha, notas')
        .eq('client_id', client.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bottlenecks')
        .select('id, codigo, descripcion, hipotesis, test_activo, proxima_decision, fecha_decision')
        .eq('client_id', client.id)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false }),
      supabase
        .from('experience_layer')
        .select('tipo, fecha, sentiment, descripcion, link, dias_desde_ultimo_contacto')
        .eq('client_id', client.id)
        .order('fecha', { ascending: false })
        .limit(3),
    ]);

    if (healthRes.data)  setHealth(healthRes.data as HealthRecord);
    if (bnRes.data)      setBottlenecks(bnRes.data as Bottleneck[]);
    if (expRes.data)     setExperience(expRes.data as Experience[]);
    setLoading(false);
  };

  // ── Health save ─────────────────────────────────────────────────────────────
  const saveHealth = async () => {
    const vals = {
      confianza:  parseInt(healthForm.confianza)  || 5,
      trust:      parseInt(healthForm.trust)      || 5,
      engagement: parseInt(healthForm.engagement) || 5,
      respuesta:  parseInt(healthForm.respuesta)  || 5,
      economia:   parseInt(healthForm.economia)   || 5,
    };
    const score_total = (
      vals.confianza + vals.trust + vals.engagement + vals.respuesta + vals.economia
    ) / 5;

    setSavingHealth(true);
    const { error } = await supabase.from('client_health').insert({
      client_id: client.id,
      ...vals,
      score_total,
      notas: healthForm.notas || null,
    });
    setSavingHealth(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Salud registrada');
    setHealthDialogOpen(false);
    setHealthForm(emptyHealthForm);
    fetchAll();
  };

  // ── Bottleneck save ──────────────────────────────────────────────────────────
  const saveBn = async () => {
    if (!bnForm.descripcion.trim()) { toast.error('La descripción es requerida'); return; }
    setSavingBn(true);
    const { error } = await supabase.from('bottlenecks').insert({
      client_id: client.id,
      codigo:           bnForm.codigo || null,
      descripcion:      bnForm.descripcion,
      hipotesis:        bnForm.hipotesis || null,
      test_activo:      bnForm.test_activo || null,
      proxima_decision: bnForm.proxima_decision || null,
      fecha_decision:   bnForm.fecha_decision || null,
      estado: 'activo',
    });
    setSavingBn(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Bottleneck registrado');
    setBnDialogOpen(false);
    setBnForm(emptyBottleneckForm);
    fetchAll();
  };

  const mainBn         = bottlenecks[0] ?? null;
  const extraBnCount   = bottlenecks.length - 1;
  const lastContact    = experience[0] ?? null;
  const daysSinceLast  = lastContact ? (daysSince(lastContact.fecha) ?? lastContact.dias_desde_ultimo_contacto) : null;

  if (loading) return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cn('h-40 rounded-lg bg-secondary/40', i < 2 ? 'col-span-2' : 'col-span-1', i === 4 && 'col-span-3')} />
      ))}
    </div>
  );

  return (
    <>
      {/* ── Health Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Registrar salud del cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">Puntuá cada eje del 1 (crítico) al 10 (excelente).</p>
            {healthAxes.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="w-28 flex-shrink-0">{label}</Label>
                <Input
                  type="number" min="1" max="10"
                  value={healthForm[key as keyof typeof healthForm]}
                  onChange={e => setHealthForm({ ...healthForm, [key]: e.target.value })}
                  className="bg-secondary/50 w-20"
                />
                <Progress
                  value={(parseInt(healthForm[key as keyof typeof healthForm]) || 0) * 10}
                  className="flex-1 h-2"
                />
              </div>
            ))}
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={healthForm.notas}
                onChange={e => setHealthForm({ ...healthForm, notas: e.target.value })}
                className="bg-secondary/50 mt-1"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setHealthDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveHealth} disabled={savingHealth}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bottleneck Dialog ──────────────────────────────────────────────── */}
      <Dialog open={bnDialogOpen} onOpenChange={setBnDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nuevo bottleneck</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código (ej: BN-04)</Label>
                <Input value={bnForm.codigo} onChange={e => setBnForm({ ...bnForm, codigo: e.target.value })} className="bg-secondary/50" placeholder="BN-01" />
              </div>
              <div>
                <Label>Fecha de decisión</Label>
                <Input type="date" value={bnForm.fecha_decision} onChange={e => setBnForm({ ...bnForm, fecha_decision: e.target.value })} className="bg-secondary/50" />
              </div>
            </div>
            <div>
              <Label>Descripción *</Label>
              <Textarea value={bnForm.descripcion} onChange={e => setBnForm({ ...bnForm, descripcion: e.target.value })} className="bg-secondary/50" rows={2} />
            </div>
            <div>
              <Label>Hipótesis</Label>
              <Textarea value={bnForm.hipotesis} onChange={e => setBnForm({ ...bnForm, hipotesis: e.target.value })} className="bg-secondary/50" rows={2} />
            </div>
            <div>
              <Label>Test activo</Label>
              <Input value={bnForm.test_activo} onChange={e => setBnForm({ ...bnForm, test_activo: e.target.value })} className="bg-secondary/50" />
            </div>
            <div>
              <Label>Próxima decisión</Label>
              <Input value={bnForm.proxima_decision} onChange={e => setBnForm({ ...bnForm, proxima_decision: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBnDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveBn} disabled={savingBn}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Torii OS (delivery_phases) ───────────────────────────────────── */}
      {loadingPhases ? (
        <div className="h-40 rounded-lg bg-secondary/40 animate-pulse" />
      ) : !hasAnyPhase ? (
        <StartToriiOSBanner clientId={client.id} onStarted={fetchPhases} />
      ) : (
        <div className="space-y-4">
          <PhaseTimeline current={currentPhase} history={phaseHistory} onSelectHistoryPhase={setHistoryDialogPhase} />
          {currentPhase && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CurrentPhaseCard
                phase={currentPhase}
                clientId={client.id}
                onAdvanced={fetchPhases}
                onRegisterBottleneck={() => setBnDialogOpen(true)}
              />
              <PhaseChecklistCard fase={currentPhase.fase} items={checklistItems} onChange={fetchPhases} />
            </div>
          )}
          {currentPhase && (
            <PhaseMetricsCard clientId={client.id} fase={currentPhase.fase} since={currentPhase.fecha_inicio} />
          )}
          <PhaseHistoryTable history={phaseHistory} onSelect={setHistoryDialogPhase} />
        </div>
      )}

      <PhaseHistoryDialog phase={historyDialogPhase} onClose={() => setHistoryDialogPhase(null)} />

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── ROW 1 LEFT: Renovación ───────────────────────────────────────
             (lo que quedó de la vieja card "Fases del delivery" —
             task_phase/result_phase/days_in_phase quedan reemplazados por
             el sistema de delivery_phases de arriba; renewal_risk/
             renewal_probability no tienen otro lugar en el spec nuevo, así
             que se mantienen acá.) */}
        <Card className="col-span-2 bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Renovación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Riesgo de renovación</p>
                {client.renewal_risk ? (
                  <Badge className={cn('border-0 text-xs mt-1', renewalRiskStyle[client.renewal_risk]?.badge)}>
                    {renewalRiskStyle[client.renewal_risk]?.label ?? client.renewal_risk}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prob. renovación</p>
                <p className="text-2xl font-bold">
                  {client.renewal_probability != null ? `${client.renewal_probability}%` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── ROW 1 RIGHT: Health Score ──────────────────────────────────── */}
        <Card className="col-span-1 bg-card border-border/50">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Salud del cliente
            </CardTitle>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setHealthDialogOpen(true)}
              title="Registrar nuevo snapshot"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(health.fecha)}
                  </span>
                  <span className={cn('text-2xl font-bold', scoreColor(health.score_total))}>
                    {health.score_total.toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground">/10</span>
                  </span>
                </div>
                {healthAxes.map(({ key, label }) => {
                  const val = health[key] as number;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{val}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', axisColor(val))}
                          style={{ width: `${val * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {health.notas && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/30 truncate" title={health.notas}>
                    {health.notas}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
                <Heart className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin datos de salud</p>
                <Button variant="outline" size="sm" onClick={() => setHealthDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1.5" />Registrar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── ROW 2: Último contacto ──────────────────────────────────────
             (Pagos se movió a Tab Ficha Básica) */}
        <Card className="col-span-3 bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Último contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {experience.length > 0 ? (
              <div className="space-y-3">
                {daysSinceLast != null && (
                  <p className={cn(
                    'text-2xl font-bold',
                    daysSinceLast > 14 ? 'text-destructive' :
                    daysSinceLast > 7  ? 'text-warning' : 'text-success'
                  )}>
                    {daysSinceLast}d
                    <span className="text-sm font-normal text-muted-foreground ml-1">sin contacto</span>
                  </p>
                )}
                <div className="space-y-2">
                  {experience.map((exp, i) => {
                    const Icon = tipoIcon[exp.tipo] ?? Activity;
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{fmtDate(exp.fecha)}</span>
                            <Badge className={cn('text-xs border-0 px-1.5 py-0', sentimentStyle[exp.sentiment])}>
                              {sentimentLabel[exp.sentiment] ?? exp.sentiment}
                            </Badge>
                          </div>
                          {exp.descripcion && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{exp.descripcion}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
                <Activity className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin registros de contacto</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── ROW 3: Bottleneck activo (full width) ──────────────────────── */}
        <Card className="col-span-3 bg-card border-border/50">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Bottleneck activo
              </CardTitle>
              {extraBnCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAllBottlenecks(v => !v)}
                >
                  <AlertTriangle className="h-3 w-3 mr-1 text-warning" />
                  {bottlenecks.length} activos
                  {showAllBottlenecks
                    ? <ChevronUp className="h-3 w-3 ml-1" />
                    : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBnDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {mainBn ? (
              <div className="space-y-4">
                {/* Main bottleneck */}
                <BottleneckRow bn={mainBn} />

                {/* Extra bottlenecks (expanded) */}
                {showAllBottlenecks && bottlenecks.slice(1).map(bn => (
                  <div key={bn.id}>
                    <Separator className="bg-border/40 my-3" />
                    <BottleneckRow bn={bn} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-20 gap-2 text-center">
                <p className="text-sm text-muted-foreground">Sin bottlenecks activos</p>
                <Button variant="outline" size="sm" onClick={() => setBnDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1.5" />Registrar bottleneck
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function BottleneckRow({ bn }: { bn: Bottleneck }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="col-span-4 flex items-start gap-2 mb-1">
        {bn.codigo && (
          <Badge variant="outline" className="text-xs font-mono flex-shrink-0">{bn.codigo}</Badge>
        )}
        <p className="font-medium text-sm leading-snug">{bn.descripcion}</p>
      </div>
      {bn.hipotesis && (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-0.5">Hipótesis</p>
          <p className="text-sm">{bn.hipotesis}</p>
        </div>
      )}
      {bn.test_activo && (
        <div className="col-span-1">
          <p className="text-xs text-muted-foreground mb-0.5">Test activo</p>
          <p className="text-sm">{bn.test_activo}</p>
        </div>
      )}
      {(bn.proxima_decision || bn.fecha_decision) && (
        <div className="col-span-1">
          <p className="text-xs text-muted-foreground mb-0.5">Próxima decisión</p>
          {bn.proxima_decision && <p className="text-sm">{bn.proxima_decision}</p>}
          {bn.fecha_decision && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(parseISO(bn.fecha_decision), "d MMM", { locale: es })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
