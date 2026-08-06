import { useEffect, useState, useCallback } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Map } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchClientRoadmap, activateRoadmap, addProcess, fetchDependencies,
} from '@/features/roadmap/lib/roadmapRepo';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '@/features/roadmap/types';
import type { RoadmapPhase, RoadmapProcess, RoadmapProcessDependency } from '@/features/roadmap/types';
import { ProcessDetailPanel } from '@/components/roadmap/ProcessDetailPanel';

interface Props {
  clientId: string;
}

export default function TabRoadmap({ clientId }: Props) {
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [processes, setProcesses] = useState<RoadmapProcess[]>([]);
  const [dependencies, setDependencies] = useState<RoadmapProcessDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ phases: p, processes: proc }, deps] = await Promise.all([
        fetchClientRoadmap(clientId),
        fetchDependencies(clientId),
      ]);
      setPhases(p);
      setProcesses(proc);
      setDependencies(deps);
    } catch (err) {
      console.error('[TabRoadmap] load failed:', err);
      toast.error('Error al cargar el Roadmap');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleActivate() {
    setActivating(true);
    try {
      await activateRoadmap(clientId);
      toast.success('Roadmap activado');
      await loadData();
    } catch (err) {
      console.error('[TabRoadmap] activation failed:', err);
      toast.error('Error al activar el Roadmap');
    } finally {
      setActivating(false);
    }
  }

  async function handleAddProcess(phaseId: string) {
    const count = processes.filter((p) => p.phase_id === phaseId && !p.parent_process_id).length;
    try {
      await addProcess(clientId, phaseId, count + 1);
      await loadData();
    } catch (err) {
      console.error('[TabRoadmap] add process failed:', err);
      toast.error('Error al agregar el proceso');
    }
  }

  if (loading) {
    return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;
  }

  if (phases.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-12 text-center flex flex-col items-center gap-4">
          <Map className="h-10 w-10 text-muted-foreground opacity-40" />
          <div>
            <p className="font-medium">Este cliente todavía no tiene su Roadmap activado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Activar copia la metodología de Torii (fases, procesos y ciclos) como una instancia propia y editable para este cliente.
            </p>
          </div>
          <Button onClick={handleActivate} disabled={activating} className="bg-primary">
            {activating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Activar Roadmap
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedProcess = processes.find((p) => p.id === selectedProcessId) ?? null;
  const globalProcesses = processes
    .filter((p) => p.phase_id === null && !p.parent_process_id)
    .sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-4">
      {globalProcesses.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Corre en paralelo — no pertenece a ninguna fase
            </p>
            <div className="flex flex-wrap gap-2">
              {globalProcesses.map((proc) => (
                <ProcessChip key={proc.id} process={proc} onClick={() => setSelectedProcessId(proc.id)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" defaultValue={[phases[0]?.id]} className="space-y-3">
        {phases.map((phase) => {
          const phaseProcesses = processes
            .filter((p) => p.phase_id === phase.id && !p.parent_process_id)
            .sort((a, b) => a.orden - b.orden);
          return (
            <AccordionItem key={phase.id} value={phase.id} className="border border-border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{phase.orden}</Badge>
                  <span className="font-semibold">{phase.nombre}</span>
                  <span className="text-xs text-muted-foreground font-normal">{phaseProcesses.length} procesos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                {(phase.objetivo_fase || phase.trigger_entrada || phase.trigger_salida) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {phase.objetivo_fase && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Objetivo</p>
                        <p className="text-muted-foreground">{phase.objetivo_fase}</p>
                      </div>
                    )}
                    {phase.trigger_entrada && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Trigger de entrada</p>
                        <p className="text-muted-foreground">{phase.trigger_entrada}</p>
                      </div>
                    )}
                    {phase.trigger_salida && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Trigger de salida</p>
                        <p className="text-muted-foreground">{phase.trigger_salida}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procesos</p>
                  <Button size="sm" variant="outline" onClick={() => handleAddProcess(phase.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar proceso
                  </Button>
                </div>

                {phaseProcesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                    Todavía no hay procesos cargados para esta fase.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phaseProcesses.map((proc) => (
                      <ProcessCard key={proc.id} process={proc} onClick={() => setSelectedProcessId(proc.id)} />
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <ProcessDetailPanel
        clientId={clientId}
        process={selectedProcess}
        allProcesses={processes}
        dependencies={dependencies}
        onClose={() => setSelectedProcessId(null)}
        onOpenProcess={setSelectedProcessId}
        onChanged={loadData}
      />
    </div>
  );
}

function ProcessCard({ process, onClick }: { process: RoadmapProcess; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-border/60 rounded-lg p-3 bg-secondary/20 hover:bg-secondary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm">{process.nombre}</span>
        {process.es_ciclo && <Badge variant="outline" className="border-primary/40 text-primary text-[10px] shrink-0">Ciclo</Badge>}
      </div>
      <Badge className={`border-0 text-[10px] mt-1.5 ${STATUS_BADGE_CLASS[process.status]}`}>
        {STATUS_LABELS[process.status]}
      </Badge>
    </button>
  );
}

function ProcessChip({ process, onClick }: { process: RoadmapProcess; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 border border-border/60 rounded-full pl-3 pr-2 py-1 bg-secondary/20 hover:bg-secondary/40 transition-colors text-sm"
    >
      {process.nombre}
      <Badge className={`border-0 text-[10px] ${STATUS_BADGE_CLASS[process.status]}`}>{STATUS_LABELS[process.status]}</Badge>
    </button>
  );
}
