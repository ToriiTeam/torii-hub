import { supabase } from '@/integrations/supabase/client';
import type { RoadmapCycle, RoadmapCycleNode, RoadmapCycleWithNodes } from '../types';

// Fetches every cycle + its nodes in 2 queries, grouped client-side —
// there are only ~5 cycles / 15 nodes total, no pagination needed.
export async function fetchCyclesWithNodes(): Promise<RoadmapCycleWithNodes[]> {
  const [{ data: cycles, error: cyclesError }, { data: nodes, error: nodesError }] = await Promise.all([
    supabase.from('roadmap_cycles').select('*').order('orden'),
    supabase.from('roadmap_cycle_nodes').select('*').order('orden'),
  ]);
  if (cyclesError) throw cyclesError;
  if (nodesError) throw nodesError;

  const nodesByCycle = new Map<string, RoadmapCycleNode[]>();
  for (const node of (nodes ?? []) as RoadmapCycleNode[]) {
    const list = nodesByCycle.get(node.cycle_id) ?? [];
    list.push(node);
    nodesByCycle.set(node.cycle_id, list);
  }

  return (cycles ?? []).map((cycle) => ({
    ...(cycle as RoadmapCycle),
    nodes: nodesByCycle.get(cycle.id) ?? [],
  }));
}

export async function updateCycleNode(id: string, patch: Partial<Pick<RoadmapCycleNode, 'nombre' | 'descripcion' | 'output'>>): Promise<void> {
  const { error } = await supabase
    .from('roadmap_cycle_nodes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
