export type CycleStatus = 'definido' | 'en_definicion';

export interface RoadmapCycle {
  id: string;
  phase_key: string | null;
  key: string;
  nombre: string;
  orden: number;
  status: CycleStatus;
  cadence: string | null;
  descripcion: string | null;
}

export interface RoadmapCycleNode {
  id: string;
  cycle_id: string;
  orden: number;
  nombre: string;
  descripcion: string | null;
  output: string | null;
}

export interface RoadmapCycleWithNodes extends RoadmapCycle {
  nodes: RoadmapCycleNode[];
}
