import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { type Client } from '@/pages/ClienteDetalle';
import {
  ChevronDown, ChevronUp, ArrowRight, MessageSquare,
  Phone, Mail, Video, Users, Activity, Zap,
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
import { fetchCuellosBotella, type CuelloBotella } from '@/features/delivery-tracker/lib/deliveryOsRepo';
import { ScorecardSaludResumen } from '@/features/delivery-tracker/components/ScorecardSaludResumen';
import type { ScorecardSalud } from '@/features/clientes/lib/scorecardVeredicto';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const navigate = useNavigate();
  const [scorecard, setScorecard] = useState<ScorecardSalud | undefined>(undefined);
  const [cuellos, setCuellos] = useState<CuelloBotella[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllBottlenecks, setShowAllBottlenecks] = useState(false);

  function goToDeliveryOsResumen() {
    navigate(`/clientes/${client.id}`);
  }

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
    const [scorecardRes, cuellosRes, expRes] = await Promise.all([
      supabase.rpc('get_scorecard_salud', { p_client_id: client.id }),
      fetchCuellosBotella(client.id).catch((err) => {
        console.error('[TabFichaOperativa] failed to load cuellos_de_botella:', err);
        return [] as CuelloBotella[];
      }),
      supabase
        .from('experience_layer')
        .select('tipo, fecha, sentiment, descripcion, link, dias_desde_ultimo_contacto')
        .eq('client_id', client.id)
        .order('fecha', { ascending: false })
        .limit(3),
    ]);

    if (scorecardRes.error) console.error('[TabFichaOperativa] scorecard failed:', scorecardRes.error.message);
    setScorecard((scorecardRes.data?.[0] as ScorecardSalud | undefined) ?? undefined);
    setCuellos(cuellosRes);
    if (expRes.data) setExperience(expRes.data as Experience[]);
    setLoading(false);
  };

  const activeCuellos  = cuellos.filter((c) => c.estado === 'activo');
  const mainBn         = activeCuellos[0] ?? null;
  const extraBnCount   = activeCuellos.length - 1;
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
                onRegisterBottleneck={goToDeliveryOsResumen}
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

        {/* ── ROW 1 RIGHT: Salud del cliente ────────────────────────────────
             Veredicto real de get_scorecard_salud — misma fuente que Vista
             Global y Delivery OS, sin carga manual. */}
        <Card className="col-span-1 bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Salud del cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScorecardSaludResumen scorecard={scorecard} />
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

        {/* ── ROW 3: Cuello de botella activo (full width) ────────────────
             Solo lectura — misma tabla cuellos_de_botella que gestiona
             Delivery OS → Resumen (única fuente de verdad, ver
             CuelloBotellaActivo.tsx). Para registrar/aplicar un plan nuevo
             hay que ir a Delivery OS. */}
        <Card className="col-span-3 bg-card border-border/50">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Cuello de botella activo
              </CardTitle>
              {extraBnCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAllBottlenecks(v => !v)}
                >
                  <Zap className="h-3 w-3 mr-1 text-destructive" />
                  {activeCuellos.length} activos
                  {showAllBottlenecks
                    ? <ChevronUp className="h-3 w-3 ml-1" />
                    : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={goToDeliveryOsResumen}>
              Gestionar en Delivery OS<ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {mainBn ? (
              <div className="space-y-3">
                <BottleneckRow bn={mainBn} />
                {showAllBottlenecks && activeCuellos.slice(1).map((c) => (
                  <div key={c.id} className="pt-3 border-t border-border/40">
                    <BottleneckRow bn={c} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-20 gap-2 text-center">
                <p className="text-sm text-muted-foreground">Sin cuellos de botella activos</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function BottleneckRow({ bn }: { bn: CuelloBotella }) {
  return (
    <div className="flex items-start gap-3">
      <Badge variant="outline" className="text-xs flex-shrink-0">{bn.categoria}</Badge>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-snug">{bn.motivo}</p>
        <p className="text-xs text-muted-foreground mt-1">{bn.plan_contingencia}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Desde {format(parseISO(bn.fecha_inicio), "d MMM", { locale: es })}
        </p>
      </div>
    </div>
  );
}
