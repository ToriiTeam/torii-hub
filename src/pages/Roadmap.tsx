import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { EditableField } from '@/components/roadmap/EditableField';
import { CycleTabs } from '@/components/roadmap/cycles/CycleTabs';
import { fetchCyclesWithNodes } from '@/features/roadmap-cycles/lib/cyclesRepo';
import type { RoadmapCycleWithNodes } from '@/features/roadmap-cycles/types';

// El mapa de delivery de Torii, vivo — no un documento estático. 2 niveles:
// roadmap_phases (las 6 macro-fases, metodología — no confundir con
// delivery_phases, que es la instancia por cliente) y roadmap_processes
// (los procesos concretos dentro de cada fase). Todo editable in-place,
// mismo contrato que VentasPage.tsx en torii-portal: click convierte el
// campo en editable, guardado directo al perder foco, sin modal.

interface RoadmapPhase {
  phase_key: string;
  nombre: string;
  orden: number;
  objetivo_fase: string | null;
  trigger_entrada: string | null;
  trigger_salida: string | null;
}

interface RoadmapProcess {
  id: string;
  phase_key: string;
  nombre: string;
  orden: number;
  objetivo: string | null;
  cuando: string | null;
  como_construirlo: string | null;
  depende_de: string | null;
  condiciona_a: string | null;
  responsable: string | null;
  done_criteria: string | null;
}

const RESPONSABLE_OPTIONS = ['Torii', 'Cliente', 'Torii + Cliente'];

export default function Roadmap() {
  const { isAdmin } = useAuth();
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [processes, setProcesses] = useState<RoadmapProcess[]>([]);
  const [cycles, setCycles] = useState<RoadmapCycleWithNodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapProcess | null>(null);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    const [{ data: p }, { data: proc }, cyc] = await Promise.all([
      supabase.from('roadmap_phases').select('*').order('orden'),
      supabase.from('roadmap_processes').select('*').order('orden'),
      fetchCyclesWithNodes(),
    ]);
    setPhases((p ?? []) as RoadmapPhase[]);
    setProcesses((proc ?? []) as RoadmapProcess[]);
    setCycles(cyc);
    setLoading(false);
  }

  async function reloadCycles() {
    setCycles(await fetchCyclesWithNodes());
  }

  async function updatePhase(phaseKey: string, field: keyof RoadmapPhase, value: string) {
    const { error } = await supabase.from('roadmap_phases').update({ [field]: value }).eq('phase_key', phaseKey);
    if (error) throw error;
    setPhases((prev) => prev.map((p) => (p.phase_key === phaseKey ? { ...p, [field]: value } : p)));
  }

  async function updateProcess(id: string, field: keyof RoadmapProcess, value: string) {
    const { error } = await supabase.from('roadmap_processes').update({ [field]: value }).eq('id', id);
    if (error) throw error;
    setProcesses((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function addProcess(phaseKey: string) {
    const count = processes.filter((p) => p.phase_key === phaseKey).length;
    const { data, error } = await supabase.from('roadmap_processes')
      .insert({ phase_key: phaseKey, nombre: 'Nuevo proceso', orden: count + 1 })
      .select('*').single();
    if (error) { toast.error(error.message); return; }
    setProcesses((prev) => [...prev, data as RoadmapProcess]);
  }

  async function deleteProcess(id: string) {
    setDeleteTarget(null);
    const { error } = await supabase.from('roadmap_processes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setProcesses((prev) => prev.filter((p) => p.id !== id));
    toast.success('Proceso eliminado');
  }

  if (isAdmin === undefined) {
    return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;
  }

  if (!isAdmin) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <ShieldAlert className="h-10 w-10 opacity-40" />
          Esta sección está disponible solo para administradores.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Roadmap</h1>
        <p className="text-sm text-muted-foreground">El mapa de delivery de Torii — fases y procesos, editable en cualquier momento</p>
      </div>

      {loading ? (
        <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />
      ) : (
        <>
          {/* Corre en paralelo sin importar en qué fase esté el cliente —
              no anida en ninguna AccordionItem, va fijo arriba de todas. */}
          {cycles.filter((c) => c.phase_key === null).length > 0 && (
            <Card className="bg-card border-border/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ciclo operativo recurrente
                </p>
                <CycleTabs cycles={cycles.filter((c) => c.phase_key === null)} onNodeSaved={reloadCycles} />
              </CardContent>
            </Card>
          )}

          <Accordion type="multiple" defaultValue={[phases[0]?.phase_key]} className="space-y-3">
          {phases.map((phase) => {
            const phaseProcesses = processes
              .filter((p) => p.phase_key === phase.phase_key)
              .sort((a, b) => a.orden - b.orden);
            const phaseCycles = cycles.filter((c) => c.phase_key === phase.phase_key);
            return (
              <AccordionItem key={phase.phase_key} value={phase.phase_key} className="border border-border rounded-lg px-4 bg-card">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{phase.orden}</Badge>
                    <span className="font-semibold">{phase.nombre}</span>
                    <span className="text-xs text-muted-foreground font-normal">{phaseProcesses.length} procesos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objetivo de la fase</p>
                      <EditableField value={phase.objetivo_fase} onSave={(v) => updatePhase(phase.phase_key, 'objetivo_fase', v)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trigger de entrada</p>
                      <EditableField value={phase.trigger_entrada} onSave={(v) => updatePhase(phase.phase_key, 'trigger_entrada', v)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trigger de salida</p>
                      <EditableField value={phase.trigger_salida} onSave={(v) => updatePhase(phase.phase_key, 'trigger_salida', v)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procesos</p>
                      <Button size="sm" variant="outline" onClick={() => addProcess(phase.phase_key)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar proceso
                      </Button>
                    </div>

                    {phaseProcesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                        Todavía no hay procesos cargados para esta fase.
                      </p>
                    ) : (
                      phaseProcesses.map((proc) => (
                        <Card key={proc.id} className="bg-secondary/20">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <EditableField
                                value={proc.nombre}
                                multiline={false}
                                onSave={(v) => v.trim() ? updateProcess(proc.id, 'nombre', v) : Promise.reject()}
                                textClassName="text-base font-semibold px-0"
                                className="text-base font-semibold max-w-md"
                              />
                              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(proc)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Field label="Objetivo" value={proc.objetivo} onSave={(v) => updateProcess(proc.id, 'objetivo', v)} />
                              <Field label="Cuándo" value={proc.cuando} onSave={(v) => updateProcess(proc.id, 'cuando', v)} />
                              <Field label="Cómo construirlo" value={proc.como_construirlo} onSave={(v) => updateProcess(proc.id, 'como_construirlo', v)} />
                              <Field label="Cómo se sabe que está terminado" value={proc.done_criteria} onSave={(v) => updateProcess(proc.id, 'done_criteria', v)} />
                              <Field label="Depende de" value={proc.depende_de} onSave={(v) => updateProcess(proc.id, 'depende_de', v)} />
                              <Field label="Condiciona a" value={proc.condiciona_a} onSave={(v) => updateProcess(proc.id, 'condiciona_a', v)} />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsable</span>
                              <Select
                                value={proc.responsable ?? '__none'}
                                onValueChange={(v) => updateProcess(proc.id, 'responsable', v === '__none' ? '' : v)}
                              >
                                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">—</SelectItem>
                                  {RESPONSABLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  {phaseCycles.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciclos</p>
                      <CycleTabs cycles={phaseCycles} onNodeSaved={reloadCycles} />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
          </Accordion>
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteTarget?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteProcess(deleteTarget.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string) => Promise<void> }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <EditableField value={value} onSave={onSave} />
    </div>
  );
}
