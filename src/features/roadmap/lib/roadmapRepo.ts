import { supabase } from '@/integrations/supabase/client';
import type {
  RoadmapPhase, RoadmapPhaseTemplate, RoadmapProcess, RoadmapProcessTemplate,
  RoadmapProcessStep, RoadmapProcessDependency, RoadmapDocument, DocumentTipo,
} from '../types';

export async function fetchClientRoadmap(clientId: string): Promise<{ phases: RoadmapPhase[]; processes: RoadmapProcess[] }> {
  const [{ data: phases, error: phasesErr }, { data: processes, error: processesErr }] = await Promise.all([
    supabase.from('roadmap_phases').select('*').eq('client_id', clientId).order('orden'),
    supabase.from('roadmap_processes').select('*').eq('client_id', clientId).order('orden'),
  ]);
  if (phasesErr) throw phasesErr;
  if (processesErr) throw processesErr;
  return { phases: (phases ?? []) as RoadmapPhase[], processes: (processes ?? []) as RoadmapProcess[] };
}

// Copia el template a la instancia del cliente en 2 pasadas — igual que
// "Activar Portal" en TabPortalCliente.tsx, pero copiando desde una tabla
// en vez de una constante hardcodeada, porque el contenido real (11
// procesos + 5 ciclos con sub-etapas) es demasiado para vivir en un
// array de JS. Pasada 1: fases y procesos raíz (parent_process_id NULL).
// Pasada 2: procesos hijos, con parent_process_id remapeado del id de
// template al id nuevo recién creado.
export async function activateRoadmap(clientId: string): Promise<void> {
  const [{ data: templatePhases, error: tpErr }, { data: templateProcesses, error: tprErr }] = await Promise.all([
    supabase.from('roadmap_phases_template').select('*').order('orden'),
    supabase.from('roadmap_processes_template').select('*').order('orden'),
  ]);
  if (tpErr) throw tpErr;
  if (tprErr) throw tprErr;
  const phases = (templatePhases ?? []) as RoadmapPhaseTemplate[];
  const processes = (templateProcesses ?? []) as RoadmapProcessTemplate[];

  const { data: newPhases, error: phaseInsertErr } = await supabase
    .from('roadmap_phases')
    .insert(phases.map((p) => ({
      client_id: clientId,
      phase_key: p.phase_key,
      nombre: p.nombre,
      orden: p.orden,
      objetivo_fase: p.objetivo_fase,
      trigger_entrada: p.trigger_entrada,
      trigger_salida: p.trigger_salida,
    })))
    .select('id, phase_key');
  if (phaseInsertErr) throw phaseInsertErr;
  const phaseIdByKey = new Map((newPhases ?? []).map((p) => [p.phase_key as string, p.id as string]));

  const roots = processes.filter((p) => !p.parent_process_id);
  const children = processes.filter((p) => p.parent_process_id);

  const toInsert = (p: RoadmapProcessTemplate, parentId: string | null) => ({
    client_id: clientId,
    phase_id: p.phase_key ? phaseIdByKey.get(p.phase_key) ?? null : null,
    template_process_id: p.id,
    parent_process_id: parentId,
    nombre: p.nombre,
    orden: p.orden,
    objetivo: p.objetivo,
    cuando: p.cuando,
    como_construirlo: p.como_construirlo,
    depende_de: p.depende_de,
    condiciona_a: p.condiciona_a,
    responsable: p.responsable,
    done_criteria: p.done_criteria,
    es_ciclo: p.es_ciclo,
    status: p.default_status ?? 'no_iniciado',
  });

  const { data: newRoots, error: rootInsertErr } = await supabase
    .from('roadmap_processes')
    .insert(roots.map((p) => toInsert(p, null)))
    .select('id, template_process_id');
  if (rootInsertErr) throw rootInsertErr;
  const newIdByTemplateId = new Map((newRoots ?? []).map((p) => [p.template_process_id as string, p.id as string]));

  if (children.length > 0) {
    const { error: childInsertErr } = await supabase
      .from('roadmap_processes')
      .insert(children.map((p) => toInsert(p, newIdByTemplateId.get(p.parent_process_id!) ?? null)));
    if (childInsertErr) throw childInsertErr;
  }
}

export async function updatePhase(id: string, patch: Partial<Pick<RoadmapPhase, 'nombre' | 'orden' | 'objetivo_fase' | 'trigger_entrada' | 'trigger_salida'>>): Promise<void> {
  const { error } = await supabase.from('roadmap_phases').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export type ProcessPatch = Partial<Pick<RoadmapProcess,
  'nombre' | 'objetivo' | 'cuando' | 'como_construirlo' | 'depende_de' | 'condiciona_a' |
  'responsable' | 'done_criteria' | 'status' | 'fecha_inicio' | 'fecha_fin'
>>;

export async function updateProcess(id: string, patch: ProcessPatch): Promise<void> {
  const { error } = await supabase.from('roadmap_processes').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function addProcess(clientId: string, phaseId: string, orden: number): Promise<RoadmapProcess> {
  const { data, error } = await supabase
    .from('roadmap_processes')
    .insert({ client_id: clientId, phase_id: phaseId, nombre: 'Nuevo proceso', orden })
    .select('*')
    .single();
  if (error) throw error;
  return data as RoadmapProcess;
}

export async function deleteProcess(id: string): Promise<void> {
  const { error } = await supabase.from('roadmap_processes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Checklist de sub-pasos ─────────────────────────────────────────────

export async function fetchSteps(processId: string): Promise<RoadmapProcessStep[]> {
  const { data, error } = await supabase.from('roadmap_process_steps').select('*').eq('process_id', processId).order('orden');
  if (error) throw error;
  return (data ?? []) as RoadmapProcessStep[];
}

export async function addStep(processId: string, texto: string, orden: number): Promise<RoadmapProcessStep> {
  const { data, error } = await supabase.from('roadmap_process_steps').insert({ process_id: processId, texto, orden }).select('*').single();
  if (error) throw error;
  return data as RoadmapProcessStep;
}

export async function toggleStep(id: string, completado: boolean): Promise<void> {
  const { error } = await supabase.from('roadmap_process_steps').update({ completado }).eq('id', id);
  if (error) throw error;
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from('roadmap_process_steps').delete().eq('id', id);
  if (error) throw error;
}

// ─── Dependencias reales entre procesos ─────────────────────────────────
// Arranca vacía siempre — sin inferencia automática desde el texto libre
// depende_de/condiciona_a, se carga a mano desde el panel.

export async function fetchDependencies(clientId: string): Promise<RoadmapProcessDependency[]> {
  // Se trae todo el set del cliente de una — son pocas filas y hacen
  // falta en ambas direcciones (depende de / condiciona a) para cualquier
  // proceso abierto en el panel.
  const { data: processIds } = await supabase.from('roadmap_processes').select('id').eq('client_id', clientId);
  const ids = (processIds ?? []).map((p) => p.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('roadmap_process_dependencies').select('*').in('process_id', ids);
  if (error) throw error;
  return (data ?? []) as RoadmapProcessDependency[];
}

export async function addDependency(processId: string, dependsOnProcessId: string): Promise<void> {
  const { error } = await supabase.from('roadmap_process_dependencies').insert({ process_id: processId, depends_on_process_id: dependsOnProcessId });
  if (error) throw error;
}

export async function removeDependency(id: string): Promise<void> {
  const { error } = await supabase.from('roadmap_process_dependencies').delete().eq('id', id);
  if (error) throw error;
}

// ─── Documentos (SOPs/playbooks) ────────────────────────────────────────

export async function fetchDocuments(clientId: string): Promise<RoadmapDocument[]> {
  const { data, error } = await supabase.from('roadmap_documents').select('*').eq('client_id', clientId).order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RoadmapDocument[];
}

export async function uploadDocument(
  clientId: string,
  processId: string | null,
  phaseId: string | null,
  titulo: string,
  tipo: DocumentTipo,
  file: File,
): Promise<RoadmapDocument> {
  const filePath = `${clientId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('roadmap-documents').upload(filePath, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('roadmap-documents').getPublicUrl(filePath);
  const { data, error } = await supabase
    .from('roadmap_documents')
    .insert({ client_id: clientId, process_id: processId, phase_id: phaseId, titulo, tipo, file_url: publicUrl })
    .select('*')
    .single();
  if (error) throw error;
  return data as RoadmapDocument;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('roadmap_documents').delete().eq('id', id);
  if (error) throw error;
}
