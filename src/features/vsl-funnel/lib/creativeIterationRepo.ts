import { supabase } from '@/integrations/supabase/client';

export interface CreativeIteration {
  id: string;
  client_id: string;
  texto: string;
  fecha: string;
  reemplaza_a_id: string | null;
}

export async function fetchCreativeIterations(clientId: string): Promise<CreativeIteration[]> {
  const { data, error } = await supabase
    .from('creative_iteration_log')
    .select('id, client_id, texto, fecha, reemplaza_a_id')
    .eq('client_id', clientId)
    .order('fecha', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addCreativeIteration(clientId: string, input: {
  texto: string; fecha: string; reemplazaAId: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('creative_iteration_log')
    .insert({
      client_id: clientId,
      texto: input.texto,
      fecha: input.fecha,
      reemplaza_a_id: input.reemplazaAId,
    });
  if (error) throw error;
}

export async function updateCreativeIteration(id: string, input: { texto: string; fecha: string }): Promise<void> {
  const { error } = await supabase
    .from('creative_iteration_log')
    .update({ texto: input.texto, fecha: input.fecha })
    .eq('id', id);
  if (error) throw error;
}

// Antes de borrar, desvincula cualquier entrada que la referenciaba como
// "reemplaza a" — sin esto quedarían apuntando a un id inexistente.
export async function deleteCreativeIteration(id: string): Promise<void> {
  const { error: unlinkErr } = await supabase
    .from('creative_iteration_log')
    .update({ reemplaza_a_id: null })
    .eq('reemplaza_a_id', id);
  if (unlinkErr) throw unlinkErr;

  const { error } = await supabase.from('creative_iteration_log').delete().eq('id', id);
  if (error) throw error;
}
