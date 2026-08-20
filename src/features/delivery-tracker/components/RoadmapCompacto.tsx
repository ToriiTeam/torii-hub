import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronRight, Check, Clock, AlertTriangle, Circle, FileText, Map as MapIcon, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchSteps, toggleStep, fetchDocuments, activateRoadmap, updateProcess } from '@/features/roadmap/lib/roadmapRepo';
import { STATUS_LABELS } from '@/features/roadmap/types';
import type { RoadmapPhase, RoadmapProcess, RoadmapProcessStep, RoadmapDocument, ProcessStatus } from '@/features/roadmap/types';
import type { PhaseTemplateRow } from '@/features/delivery-tracker/lib/roadmap';

const STATUSES = Object.keys(STATUS_LABELS) as ProcessStatus[];

const STATUS_COLOR: Record<ProcessStatus, string> = {
  completado: 'text-success bg-success/15',
  en_curso: 'text-warning bg-warning/15',
  bloqueado: 'text-destructive bg-destructive/15',
  no_iniciado: 'text-muted-foreground bg-muted',
};

const STATUS_ICON: Record<ProcessStatus, LucideIcon> = {
  completado: Check,
  en_curso: Clock,
  bloqueado: AlertTriangle,
  no_iniciado: Circle,
};

const RESPONSABLE_INITIALS: Record<string, string> = {
  'Torii': 'T',
  'Cliente': 'C',
  'Torii + Cliente': 'T+C',
};

interface Props {
  clientId: string;
  phases: RoadmapPhase[];
  processes: RoadmapProcess[];
  phaseTemplate: PhaseTemplateRow[];
  currentPhase: RoadmapPhase | null;
  onChanged: () => void;
}

export function RoadmapCompacto({ clientId, phases, processes, phaseTemplate, currentPhase, onChanged }: Props) {
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    setActivating(true);
    try {
      await activateRoadmap(clientId);
      toast.success('Roadmap activado');
      onChanged();
    } catch (err) {
      console.error('[RoadmapCompacto] activation failed:', err);
      toast.error('Error al activar el Roadmap');
    } finally {
      setActivating(false);
    }
  }

  const phaseByKey = new Map(phases.map((p) => [p.phase_key, p]));
  const currentOrden = currentPhase?.orden ?? (phases.length > 0 ? Infinity : -1);

  const visibleProcesses = currentPhase
    ? processes.filter((p) => p.phase_id === currentPhase.id).sort((a, b) => a.orden - b.orden)
    : [];

  return (
    <div>
      <h2 className="font-sans font-extrabold text-lg mb-4">Roadmap</h2>

      <div className="flex items-center mb-5 overflow-x-auto pb-1">
        {phaseTemplate.map((tpl, i) => {
          const real = phaseByKey.get(tpl.phase_key);
          const isCurrent = currentPhase?.phase_key === tpl.phase_key;
          const isDone = real ? real.orden < currentOrden : false;
          return (
            <div key={tpl.phase_key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold',
                  isDone ? 'bg-success text-background'
                    : isCurrent ? 'bg-warning text-background'
                      : 'bg-secondary border border-border/60 text-muted-foreground/70',
                )}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : tpl.orden}
                </div>
                <span className={cn('text-[10px] w-16 text-center', isCurrent ? 'text-warning' : 'text-muted-foreground/70')}>
                  {tpl.nombre}
                </span>
              </div>
              {i < phaseTemplate.length - 1 && (
                <div className={cn('h-px flex-1 min-w-4 mx-1', isDone ? 'bg-success' : 'bg-border/50')} />
              )}
            </div>
          );
        })}
      </div>

      {phases.length === 0 ? (
        <Card className="bg-card border-border/50 rounded-2xl">
          <CardContent className="p-12 text-center flex flex-col items-center gap-4">
            <MapIcon className="h-10 w-10 text-muted-foreground opacity-40" />
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
      ) : !currentPhase ? (
        <Card className="bg-card border-border/50 rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            Todos los procesos de este cliente están completados.
          </CardContent>
        </Card>
      ) : visibleProcesses.length === 0 ? (
        <Card className="bg-card border-border/50 rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            Todavía no hay procesos cargados para la fase actual.
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border/50 rounded-2xl overflow-hidden">
          {visibleProcesses.map((process) => (
            <ProcessRow key={process.id} clientId={clientId} process={process} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessRow({ clientId, process, onChanged }: { clientId: string; process: RoadmapProcess; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<RoadmapProcessStep[] | null>(null);
  const [documents, setDocuments] = useState<RoadmapDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Guardado directo al cambiar — es un solo campo, no hace falta un botón
  // "Guardar" aparte para esto (a diferencia de ProcessDetailPanel, que
  // junta varios campos en un mismo submit). ProcessDetailPanel tampoco
  // valida dependencias antes de guardar el status — dependsOn/dependedBy
  // ahí son solo enlaces informativos, no gatean la transición — así que
  // no hay ninguna lógica de validación que reusar más allá del Select en
  // sí y el PATCH a updateProcess.
  async function handleStatusChange(status: ProcessStatus) {
    setSavingStatus(true);
    try {
      await updateProcess(process.id, { status });
      onChanged();
    } catch (err) {
      console.error('[ProcessRow] status change failed:', err);
      toast.error('Error al actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && steps === null) {
      setLoading(true);
      try {
        const [s, docs] = await Promise.all([
          fetchSteps(process.id),
          fetchDocuments(clientId).then((all) => all.filter((d) => d.process_id === process.id)),
        ]);
        setSteps(s);
        setDocuments(docs);
      } catch (err) {
        console.error('[ProcessRow] load checklist failed:', err);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleToggleStep(step: RoadmapProcessStep) {
    setSteps((prev) => prev?.map((s) => (s.id === step.id ? { ...s, completado: !s.completado } : s)) ?? prev);
    try {
      await toggleStep(step.id, !step.completado);
      onChanged();
    } catch (err) {
      console.error('[ProcessRow] toggle step failed:', err);
      toast.error('Error al actualizar el paso');
      setSteps((prev) => prev?.map((s) => (s.id === step.id ? { ...s, completado: step.completado } : s)) ?? prev);
    }
  }

  const hasChecklist = steps === null ? true : steps.length > 0;
  const Icon = STATUS_ICON[process.status];
  const initials = process.responsable ? RESPONSABLE_INITIALS[process.responsable] ?? process.responsable[0] : '—';

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-2.5 px-[18px] py-3.5 text-left hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {hasChecklist ? (
            <ChevronRight className={cn('h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-transform', open && 'rotate-90')} />
          ) : (
            <span className="w-3.5 flex-shrink-0" />
          )}
          <span className="h-6 w-6 rounded-full bg-white/[0.06] text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {initials}
          </span>
          <span className="text-sm font-medium truncate">{process.nombre}</span>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {process.fecha_fin && (
            <span className="text-xs text-muted-foreground/70">{format(parseISO(process.fecha_fin), 'd MMM', { locale: es })}</span>
          )}
          <Select value={process.status} onValueChange={(v) => handleStatusChange(v as ProcessStatus)} disabled={savingStatus}>
            <SelectTrigger
              className={cn(
                'h-auto w-auto gap-1.5 border-0 text-[11px] font-semibold px-2.5 py-1 rounded-full [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60',
                STATUS_COLOR[process.status],
              )}
            >
              <Icon className="h-3 w-3" />
              <SelectValue>{STATUS_LABELS[process.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </button>

      {open && (
        <div className="px-[18px] pb-4 pl-[46px]">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando…</div>
          ) : (
            <>
              {steps && steps.length > 0 && (
                <div className="bg-white/[0.03] rounded-lg p-3">
                  {steps.map((step) => (
                    <label key={step.id} className="flex items-center gap-2.5 py-1.5 text-sm text-foreground/80 cursor-pointer">
                      <Checkbox checked={step.completado} onCheckedChange={() => handleToggleStep(step)} />
                      <span className={cn(step.completado && 'line-through text-muted-foreground')}>{step.texto}</span>
                    </label>
                  ))}
                </div>
              )}
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mt-2 px-2 py-1.5 bg-white/[0.04] rounded-md w-fit"
                >
                  <FileText className="h-3 w-3" />
                  {doc.titulo}
                </a>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
