import { supabase } from '@/integrations/supabase/client';

// Único punto de guardado para cancelar un cliente — usado tanto desde la
// grilla (Clientes.tsx) como desde el header de ClienteDetalle.tsx vía
// CancelClientDialog. No se elimina ningún dato, solo status + motivo/fecha.
export async function cancelClient(clientId: string, motivo: string, fecha: string): Promise<string | null> {
  const { error } = await supabase
    .from('clients')
    .update({
      status: 'cancelled',
      motivo_cancelacion: motivo.trim(),
      fecha_cancelacion: fecha,
    })
    .eq('id', clientId);
  return error ? error.message : null;
}
