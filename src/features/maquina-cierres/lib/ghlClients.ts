import { supabase } from '@/integrations/supabase/client';
import type { GhlContactSummary } from '../types';

export interface GhlClientsResult {
  contacts: GhlContactSummary[];
  warning: string | null;
}

// Calls the ghl-mc-clients edge function, which holds the GHL Private
// Integration Token server-side (never exposed to the browser) and returns
// contacts tagged 'sv-cliente-activo' with their sv_fecha_ultima_compra
// custom field already resolved.
export async function fetchGhlClients(): Promise<GhlClientsResult> {
  const { data, error } = await supabase.functions.invoke('ghl-mc-clients', { body: {} });
  if (error) throw error;
  return {
    contacts: (data?.data ?? []) as GhlContactSummary[],
    warning: data?.warning ?? null,
  };
}
