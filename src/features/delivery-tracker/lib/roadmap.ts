import { supabase } from '@/integrations/supabase/client';
import type { RoadmapPhase, RoadmapProcess } from '@/features/roadmap/types';

export interface PhaseTemplateRow {
  phase_key: string;
  nombre: string;
  orden: number;
}

export async function fetchPhaseTemplate(): Promise<PhaseTemplateRow[]> {
  const { data, error } = await supabase
    .from('roadmap_phases_template')
    .select('phase_key, nombre, orden')
    .order('orden');
  if (error) throw error;
  return (data ?? []) as PhaseTemplateRow[];
}

// "Fase actual" no existe como campo — se infiere como la primera fase
// (por orden) con al menos un proceso no completado. Si no hay ninguna
// (todo completo, o el cliente no tiene roadmap activado), no hay fase
// actual. Criterio confirmado al construir Delivery OS.
export function inferCurrentPhase(phases: RoadmapPhase[], processes: RoadmapProcess[]): RoadmapPhase | null {
  const sorted = [...phases].sort((a, b) => a.orden - b.orden);
  for (const phase of sorted) {
    const hasPending = processes.some((p) => p.phase_id === phase.id && p.status !== 'completado');
    if (hasPending) return phase;
  }
  return null;
}
