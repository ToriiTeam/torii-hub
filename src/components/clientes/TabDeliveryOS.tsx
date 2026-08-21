import { useCallback, useEffect, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useRegisterSubsection } from '@/contexts/HeaderNavContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchClientRoadmap } from '@/features/roadmap/lib/roadmapRepo';
import type { RoadmapPhase, RoadmapProcess } from '@/features/roadmap/types';
import { fetchPhaseTemplate, inferCurrentPhase, type PhaseTemplateRow } from '@/features/delivery-tracker/lib/roadmap';
import {
  fetchCuellosBotella, fetchActivityLog, fetchHipotesis,
  type CuelloBotella, type ActivityLogRow, type Hipotesis,
} from '@/features/delivery-tracker/lib/deliveryOsRepo';
import type { ScorecardSalud } from '@/features/clientes/lib/scorecardVeredicto';
import { ScorecardQuadrant } from '@/features/delivery-tracker/components/ScorecardQuadrant';
import { MetricasClave } from '@/features/delivery-tracker/components/MetricasClave';
import { CuelloBotellaActivo } from '@/features/delivery-tracker/components/CuelloBotellaActivo';
import { ProximosDeadlines } from '@/features/delivery-tracker/components/ProximosDeadlines';
import { HistorialCuellos } from '@/features/delivery-tracker/components/HistorialCuellos';
import { RoadmapCompacto } from '@/features/delivery-tracker/components/RoadmapCompacto';
import { CalendarioSection } from '@/features/delivery-tracker/components/CalendarioSection';
import { BitacoraTimeline } from '@/features/delivery-tracker/components/BitacoraTimeline';
import { BitacoraHipotesis } from '@/features/delivery-tracker/components/BitacoraHipotesis';
import { AlertTriangle } from 'lucide-react';
import TabEstrategiaCliente from '@/components/clientes/TabEstrategiaCliente';
import TabVSLFunnel from '@/components/clientes/TabVSLFunnel';
import TabContenidoCliente from '@/components/clientes/TabContenidoCliente';
import TabChatCliente from '@/components/clientes/TabChatCliente';
import type { Client } from '@/pages/ClienteDetalle';

// Closing salió de acá — ahora es su propio tab de primer nivel en
// ClienteDetalle.tsx (ver TABS ahí), no una subsección de Delivery OS.
const SUB_TABS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'informacion', label: 'Información' },
  { value: 'vsl-funnel', label: 'VSL Funnel' },
  { value: 'social-funnel', label: 'Social Funnel' },
  { value: 'chat', label: 'Chat' },
];

interface Props {
  client: Client;
  onClientUpdate: () => void;
  activeSubtab: string;
  onSubtabChange: (subtab: string) => void;
}

interface State {
  scorecard: ScorecardSalud | undefined;
  phases: RoadmapPhase[];
  processes: RoadmapProcess[];
  phaseTemplate: PhaseTemplateRow[];
  cuellos: CuelloBotella[];
  activityLog: ActivityLogRow[];
  hipotesis: Hipotesis[];
}

const EMPTY_STATE: State = { scorecard: undefined, phases: [], processes: [], phaseTemplate: [], cuellos: [], activityLog: [], hipotesis: [] };

export default function TabDeliveryOS({ client, onClientUpdate, activeSubtab, onSubtabChange }: Props) {
  const clientId = client.id;
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scorecardRes, roadmap, phaseTemplate, cuellos, activityLog, hipotesis] = await Promise.all([
        supabase.rpc('get_scorecard_salud', { p_client_id: clientId }),
        fetchClientRoadmap(clientId),
        fetchPhaseTemplate(),
        fetchCuellosBotella(clientId),
        fetchActivityLog(clientId),
        fetchHipotesis(clientId),
      ]);
      if (scorecardRes.error) console.error('[TabDeliveryOS] scorecard failed:', scorecardRes.error.message);
      setState({
        scorecard: (scorecardRes.data?.[0] as ScorecardSalud | undefined) ?? undefined,
        phases: roadmap.phases,
        processes: roadmap.processes,
        phaseTemplate,
        cuellos,
        activityLog,
        hipotesis,
      });
    } catch (err) {
      console.error('[TabDeliveryOS] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Punto B.2 del rediseño de header: esta fila de sub-tabs (Resumen/
  // Información/VSL Funnel/Social Funnel) ya no se pinta acá — se publica
  // para que Layout.tsx la pinte en el header gris. Se registra siempre
  // (no solo post-loading) para que la fila no parpadee al cambiar de
  // sub-tab mientras loadAll() está en vuelo.
  useRegisterSubsection({ items: SUB_TABS, activeValue: activeSubtab, onChange: onSubtabChange });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-secondary/40 animate-pulse" />
        <div className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />
        <div className="h-40 rounded-2xl bg-secondary/40 animate-pulse" />
      </div>
    );
  }

  const { scorecard, phases, processes, phaseTemplate, cuellos, activityLog, hipotesis } = state;
  const currentPhase = inferCurrentPhase(phases, processes);

  const days = scorecard?.dias_desde_arranque_real;
  const diasCampana = !scorecard || scorecard.sin_campana || days == null ? null : days + 1;
  const atraso = phaseAtraso(currentPhase, processes);

  return (
    <Tabs value={activeSubtab} onValueChange={onSubtabChange} className="space-y-5">
      <TabsContent value="resumen">
        <div className="space-y-7">
          {/* Scorecard — sin el nombre del cliente como heading (punto
              B.3, ya se sabe qué cliente es por el switcher), solo los
              badges de fase/atraso si corresponden. */}
          <div className="flex justify-between items-start gap-5 flex-wrap">
            <div>
              {(currentPhase || (atraso != null && atraso > 0)) && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {currentPhase && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-warning/10 text-warning">
                      {currentPhase.nombre}
                    </span>
                  )}
                  {atraso != null && atraso > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-destructive/12 text-destructive">
                      <AlertTriangle className="h-3 w-3" />{atraso} días atrasado vs. plan
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {diasCampana != null ? `Día ${diasCampana} de campaña` : 'Sin campaña activa'}
              </p>
            </div>
            <ScorecardQuadrant scorecard={scorecard} />
          </div>

          {/* Métricas clave */}
          <MetricasClave clientId={clientId} />

          {/* Cuello de botella activo + Próximos deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3.5 items-stretch">
            <CuelloBotellaActivo clientId={clientId} currentPhaseId={currentPhase?.id ?? null} onApplied={loadAll} />
            <ProximosDeadlines processes={processes} />
          </div>

          <HistorialCuellos cuellos={cuellos} />

          <RoadmapCompacto
            clientId={clientId}
            phases={phases}
            processes={processes}
            phaseTemplate={phaseTemplate}
            currentPhase={currentPhase}
            onChanged={loadAll}
          />

          <BitacoraHipotesis clientId={clientId} hipotesis={hipotesis} onChanged={loadAll} />

          <CalendarioSection processes={processes} onChanged={loadAll} />

          <BitacoraTimeline clientId={clientId} activityLog={activityLog} cuellos={cuellos} onChanged={loadAll} />
        </div>
      </TabsContent>

      <TabsContent value="informacion">
        <TabEstrategiaCliente client={client} onClientUpdate={onClientUpdate} />
      </TabsContent>

      <TabsContent value="vsl-funnel">
        <TabVSLFunnel clientId={clientId} vslTrackingHref={`/c/${clientId}/vsl`} />
      </TabsContent>

      <TabsContent value="social-funnel">
        <TabContenidoCliente clientId={clientId} />
      </TabsContent>

      <TabsContent value="chat">
        <TabChatCliente client={client} />
      </TabsContent>
    </Tabs>
  );
}

// Días de atraso vs. plan — aproximación honesta: procesos vencidos
// (fecha_fin pasada, no completados) de la fase actual, el más antiguo
// marca el atraso. No hay un "plan" formal contra el cual comparar más
// allá de las fechas ya cargadas en cada proceso.
function phaseAtraso(currentPhase: RoadmapPhase | null, processes: RoadmapProcess[]): number | null {
  if (!currentPhase) return null;
  const overdue = processes
    .filter((p) => p.phase_id === currentPhase.id && p.status !== 'completado' && p.fecha_fin)
    .map((p) => differenceInCalendarDays(new Date(), parseISO(p.fecha_fin as string)))
    .filter((d) => d > 0);
  if (overdue.length === 0) return null;
  return Math.max(...overdue);
}
