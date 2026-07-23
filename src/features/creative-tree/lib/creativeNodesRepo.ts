import { supabase } from '@/integrations/supabase/client';
import type { CreativeEstado, CreativeNode, CreativeTipo } from '../types';

export async function fetchNodes(clientId: string): Promise<CreativeNode[]> {
  const { data, error } = await supabase
    .from('creative_nodes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CreativeNode[];
}

export interface NewNodeInput {
  client_id: string;
  parent_id: string | null;
  nombre: string;
  tipo: CreativeTipo;
  hipotesis?: string | null;
  position_x?: number;
  position_y?: number;
}

export async function createNode(input: NewNodeInput): Promise<CreativeNode> {
  const { data, error } = await supabase
    .from('creative_nodes')
    .insert({
      client_id: input.client_id,
      parent_id: input.parent_id,
      nombre: input.nombre,
      tipo: input.tipo,
      hipotesis: input.hipotesis ?? null,
      position_x: input.position_x ?? 0,
      position_y: input.position_y ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CreativeNode;
}

export interface UpdateNodeInput {
  nombre: string;
  angulo: string | null;
  hipotesis: string | null;
  estado: CreativeEstado;
  tipo: CreativeTipo;
  media_url: string | null;
  notas: string | null;
}

export async function updateNode(id: string, input: UpdateNodeInput): Promise<void> {
  const { error } = await supabase
    .from('creative_nodes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Lightweight partial update — used right after node creation to attach an
// uploaded image or pasted link, without needing the full updateNode() form.
export async function setNodeMediaUrl(id: string, media_url: string | null): Promise<void> {
  const { error } = await supabase
    .from('creative_nodes')
    .update({ media_url, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function savePosition(id: string, position_x: number, position_y: number): Promise<void> {
  const { error } = await supabase
    .from('creative_nodes')
    .update({ position_x, position_y })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNode(id: string): Promise<void> {
  const { error } = await supabase.from('creative_nodes').delete().eq('id', id);
  if (error) throw error;
}
