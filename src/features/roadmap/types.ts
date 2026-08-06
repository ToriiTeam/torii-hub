// El Roadmap tiene 2 niveles de datos:
//  - *_template: la metodología única de Torii (1 sola versión).
//  - roadmap_phases/roadmap_processes: la instancia editable por cliente,
//    activada copiando desde el template (mismo patrón que "Activar
//    Portal" en TabPortalCliente.tsx).
// Los ciclos (Media Buying, Testeo de VSL, Ciclo 1/2, el operativo
// semanal) NO son un modelo aparte — son roadmap_processes con
// es_ciclo=true, cuyas etapas son otros roadmap_processes con
// parent_process_id apuntando a ellos. Un solo modelo, un solo panel.

export type ProcessStatus = 'no_iniciado' | 'en_curso' | 'completado' | 'bloqueado';
export type Responsable = 'Torii' | 'Cliente' | 'Torii + Cliente';
export type DocumentTipo = 'sop' | 'playbook' | 'documento';

export const STATUS_LABELS: Record<ProcessStatus, string> = {
  no_iniciado: 'No iniciado',
  en_curso: 'En curso',
  completado: 'Completado',
  bloqueado: 'Bloqueado',
};

export const STATUS_BADGE_CLASS: Record<ProcessStatus, string> = {
  no_iniciado: 'bg-secondary text-muted-foreground',
  en_curso: 'bg-primary/15 text-primary',
  completado: 'bg-emerald-500/15 text-emerald-500',
  bloqueado: 'bg-amber-500/15 text-amber-500',
};

export const RESPONSABLE_OPTIONS: Responsable[] = ['Torii', 'Cliente', 'Torii + Cliente'];

export const DOCUMENT_TIPO_LABELS: Record<DocumentTipo, string> = {
  sop: 'SOP',
  playbook: 'Playbook',
  documento: 'Documento',
};

export interface RoadmapPhaseTemplate {
  phase_key: string;
  nombre: string;
  orden: number;
  objetivo_fase: string | null;
  trigger_entrada: string | null;
  trigger_salida: string | null;
}

export interface RoadmapProcessTemplate {
  id: string;
  phase_key: string | null;
  nombre: string;
  orden: number;
  objetivo: string | null;
  cuando: string | null;
  como_construirlo: string | null;
  depende_de: string | null;
  condiciona_a: string | null;
  responsable: Responsable | null;
  done_criteria: string | null;
  es_ciclo: boolean;
  parent_process_id: string | null;
  default_status: ProcessStatus | null;
}

export interface RoadmapPhase {
  id: string;
  client_id: string;
  phase_key: string;
  nombre: string;
  orden: number;
  objetivo_fase: string | null;
  trigger_entrada: string | null;
  trigger_salida: string | null;
}

export interface RoadmapProcess {
  id: string;
  client_id: string;
  phase_id: string | null;
  template_process_id: string | null;
  nombre: string;
  orden: number;
  objetivo: string | null;
  cuando: string | null;
  como_construirlo: string | null;
  depende_de: string | null;
  condiciona_a: string | null;
  responsable: Responsable | null;
  done_criteria: string | null;
  es_ciclo: boolean;
  parent_process_id: string | null;
  status: ProcessStatus;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface RoadmapProcessStep {
  id: string;
  process_id: string;
  texto: string;
  completado: boolean;
  orden: number;
}

export interface RoadmapProcessDependency {
  id: string;
  process_id: string;
  depends_on_process_id: string;
}

export interface RoadmapDocument {
  id: string;
  client_id: string;
  phase_id: string | null;
  process_id: string | null;
  titulo: string;
  tipo: DocumentTipo;
  file_url: string;
  uploaded_at: string;
}
