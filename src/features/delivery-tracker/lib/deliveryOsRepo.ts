import { supabase } from '@/integrations/supabase/client';
import { calcCostoPorLlamadaCalificada } from '@/features/executive-dashboard/lib/businessHealth';
import { findMotivo } from './motivos';

// CPBC = costo por llamada CALIFICADA — única definición correcta confirmada
// en todo el sistema (se_presento=true AND califico=true en
// client_closer_calls), mismo filtro que ya usan fetchToriiData.ts y
// meta-ads/lib/fetchCpbc.ts. fetchClientData.ts (reusado para Show
// Rate/Tasa Calificación/Close Rate en MetricasClave.tsx) trae un `cpbc`
// propio que divide por TODAS las llamadas agendadas — ese campo NO se usa
// acá a propósito, se recalcula con este filtro en su lugar.
export async function fetchCpbcCalificado(clientId: string, adsInversion: number, since: string, until: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('client_closer_calls')
    .select('id', { count: 'exact', head: true })
    .eq('owner_type', 'client')
    .eq('client_id', clientId)
    .eq('se_presento', true)
    .eq('califico', true)
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until);
  if (error) throw error;
  return calcCostoPorLlamadaCalificada(adsInversion, count ?? 0);
}

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

// Función separada de updateHipotesisEstado (abajo) a propósito — esa es de
// un solo campo para el kanban, mezclar las dos firmas complica el caller.
export async function updateHipotesis(id: string, input: {
  texto: string; metrica: string; responsable: string; fecha: string;
}): Promise<void> {
  const { error } = await supabase
    .from('hipotesis')
    .update({
      texto: input.texto,
      metrica: input.metrica || null,
      responsable: input.responsable || null,
      fecha: input.fecha,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteHipotesis(id: string): Promise<void> {
  const { error } = await supabase.from('hipotesis').delete().eq('id', id);
  if (error) throw error;
}

// Usado por el kanban de VSL Funnel > Hipótesis para mover una tarjeta de
// columna — mismos 4 valores de estado que ya tiene la tabla.
export async function updateHipotesisEstado(id: string, estado: Hipotesis['estado']): Promise<void> {
  const { error } = await supabase.from('hipotesis').update({ estado }).eq('id', id);
  if (error) throw error;
}
