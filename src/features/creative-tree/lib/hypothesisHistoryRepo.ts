import { supabase } from '@/integrations/supabase/client';
import type { CreativeNode } from '../types';
import type { HypothesisHistoryEntry, HypothesisResultado } from '../types';

// Walks parent_id up from startId to the root of its branch — the root
// node is what a client_closer_calls-less, ads-less "ángulo base" maps to.
// creative_nodes has no direct FK to angles (it's the other way around:
// angles.creative_node_id points AT a node), so resolving "which angle does
// this iteration belong to" means finding that root and then asking angles
// if anything points at it.
export function findRootNodeId(nodes: CreativeNode[], startId: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(startId);
  const visited = new Set<string>();
  while (current?.parent_id && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    current = parent;
  }
  return current?.id ?? startId;
}

export async function findAngleIdForRootNode(rootNodeId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('angles')
    .select('id')
    .eq('creative_node_id', rootNodeId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export interface NewHypothesisInput {
  client_id: string;
  creative_node_id: string;
  angle_id: string | null;
  hipotesis: string;
  fecha_inicio: string; // yyyy-MM-dd
}

export async function createHypothesisEntry(input: NewHypothesisInput): Promise<HypothesisHistoryEntry> {
  const { data, error } = await supabase
    .from('hypothesis_history')
    .insert({
      client_id: input.client_id,
      creative_node_id: input.creative_node_id,
      angle_id: input.angle_id,
      hipotesis: input.hipotesis,
      fecha_inicio: input.fecha_inicio,
      // metricas_inicio intentionally left null — there's no link today
      // between creative_nodes and ads_metricas_diarias/client_closer_calls
      // to pull real numbers from without a fragile name-based match.
      metricas_inicio: null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as HypothesisHistoryEntry;
}

// The "open" hypothesis for a node is the one with no fecha_cierre yet.
// Multiple closed entries could theoretically pile up for the same node
// over time (not possible yet since nodes only get one entry at creation),
// so this always takes the most recent by created_at.
export async function fetchOpenHypothesis(creativeNodeId: string): Promise<HypothesisHistoryEntry | null> {
  const { data, error } = await supabase
    .from('hypothesis_history')
    .select('*')
    .eq('creative_node_id', creativeNodeId)
    .is('fecha_cierre', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as HypothesisHistoryEntry | null) ?? null;
}

export interface CloseHypothesisInput {
  resultado: HypothesisResultado;
  aprendizaje: string;
  fecha_cierre: string; // yyyy-MM-dd
}

export async function closeHypothesis(id: string, input: CloseHypothesisInput): Promise<void> {
  const { error } = await supabase
    .from('hypothesis_history')
    .update({
      resultado: input.resultado,
      aprendizaje: input.aprendizaje,
      fecha_cierre: input.fecha_cierre,
      // metricas_fin left null for the same reason metricas_inicio is —
      // see createHypothesisEntry.
      metricas_fin: null,
    })
    .eq('id', id);
  if (error) throw error;
}
