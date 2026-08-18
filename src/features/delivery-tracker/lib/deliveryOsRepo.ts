import { supabase } from '@/integrations/supabase/client';
import { findMotivo } from './motivos';

export interface CuelloBotella {
  id: string;
  client_id: string;
  roadmap_process_id: string | null;
  categoria: string;
  motivo: string;
  plan_contingencia: string;
  estado: 'activo' | 'resuelto' | 'descartado';
  fecha_inicio: string;
  fecha_resolucion: string | null;
  resultado: string | null;
}

export async function fetchCuellosBotella(clientId: string): Promise<CuelloBotella[]> {
  const { data, error } = await supabase
    .from('cuellos_de_botella')
    .select('*')
    .eq('client_id', clientId)
    .order('fecha_inicio', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CuelloBotella[];
}

// Los 3 pasos de "Aplicar al Roadmap" — mismo encadenado que ya definimos
// al armar Delivery OS: cuello_de_botella → roadmap_process (vinculado de
// vuelta vía roadmap_process_id) → client_activity_log (la "rama" del
// timeline). Si algún paso falla después de crear el cuello, no se
// revierte lo ya insertado — es preferible dejar rastro parcial y que
// quede visible en el historial a perder silenciosamente la acción.
export async function applyBottleneckPlan(
  clientId: string,
  motivoKey: string,
  currentPhaseId: string | null,
): Promise<void> {
  const found = findMotivo(motivoKey);
  if (!found) throw new Error(`Motivo desconocido: ${motivoKey}`);
  const { grupo, item } = found;

  const { data: cuello, error: cuelloErr } = await supabase
    .from('cuellos_de_botella')
    .insert({
      client_id: clientId,
      categoria: grupo.categoria,
      motivo: item.label,
      plan_contingencia: item.planContingencia,
      estado: 'activo',
    })
    .select('id')
    .single();
  if (cuelloErr) throw cuelloErr;

  const { data: process, error: processErr } = await supabase
    .from('roadmap_processes')
    .insert({
      client_id: clientId,
      phase_id: currentPhaseId,
      nombre: item.planContingencia,
      status: 'no_iniciado',
    })
    .select('id')
    .single();
  if (processErr) throw processErr;

  const { error: linkErr } = await supabase
    .from('cuellos_de_botella')
    .update({ roadmap_process_id: process.id })
    .eq('id', cuello.id);
  if (linkErr) throw linkErr;

  const { error: logErr } = await supabase
    .from('client_activity_log')
    .insert({
      client_id: clientId,
      tipo: 'sistema',
      cuello_de_botella_id: cuello.id,
      texto: `Se aplicó el plan de contingencia para "${item.label}": ${item.planContingencia}`,
    });
  if (logErr) throw logErr;
}

export interface ActivityLogRow {
  id: string;
  client_id: string;
  texto: string;
  fecha: string;
  tipo: 'manual' | 'sistema';
  cuello_de_botella_id: string | null;
}

export async function fetchActivityLog(clientId: string): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('client_activity_log')
    .select('*')
    .eq('client_id', clientId)
    .order('fecha', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActivityLogRow[];
}

export async function addHito(clientId: string, fecha: string, texto: string): Promise<void> {
  const { error } = await supabase
    .from('client_activity_log')
    .insert({ client_id: clientId, tipo: 'manual', texto, fecha });
  if (error) throw error;
}

export interface Hipotesis {
  id: string;
  client_id: string;
  texto: string;
  metrica: string | null;
  responsable: string | null;
  estado: 'testeando' | 'validado' | 'matado' | 'a_iterar';
  fecha: string;
  resultado: string | null;
}

export async function fetchHipotesis(clientId: string): Promise<Hipotesis[]> {
  const { data, error } = await supabase
    .from('hipotesis')
    .select('*')
    .eq('client_id', clientId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Hipotesis[];
}

export async function addHipotesis(clientId: string, input: {
  texto: string; metrica: string; responsable: string; fecha: string;
}): Promise<void> {
  const { error } = await supabase
    .from('hipotesis')
    .insert({
      client_id: clientId,
      texto: input.texto,
      metrica: input.metrica || null,
      responsable: input.responsable || null,
      fecha: input.fecha,
    });
  if (error) throw error;
}
