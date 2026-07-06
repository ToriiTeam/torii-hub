import { supabase } from '@/integrations/supabase/client';
import type { McClientOps } from '../types';

export async function listClientOps(): Promise<McClientOps[]> {
  const { data, error } = await supabase.from('mc_client_ops').select('*');
  if (error) throw error;
  return (data ?? []) as McClientOps[];
}

// Upsert by ghl_contact_id — a row is created on first edit (checkbox or
// note) for a contact that doesn't have one yet, updated otherwise.
export async function upsertClientOps(
  ghlContactId: string,
  patch: Partial<Pick<McClientOps, 'academia_access_granted' | 'whatsapp_group_added' | 'notes'>>,
): Promise<McClientOps> {
  const { data, error } = await supabase
    .from('mc_client_ops')
    .upsert(
      { ghl_contact_id: ghlContactId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'ghl_contact_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as McClientOps;
}
