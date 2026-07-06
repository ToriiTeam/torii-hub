import { supabase } from '@/integrations/supabase/client';
import { PHASE_CHECKLISTS, PHASE_DEFAULT_DAYS, PHASE_ORDER } from '../types';
import type { DeliveryPhase, PhaseChecklistItem, PhaseKey } from '../types';

export interface PhasesData {
  current: DeliveryPhase | null;
  history: DeliveryPhase[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchClientPhases(clientId: string): Promise<PhasesData> {
  const { data, error } = await supabase
    .from('delivery_phases')
    .select('*')
    .eq('client_id', clientId)
    .order('fecha_inicio', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as DeliveryPhase[];
  return {
    current: rows.find((r) => r.fecha_fin === null) ?? null,
    history: rows.filter((r) => r.fecha_fin !== null),
  };
}

export async function fetchChecklist(clientId: string, fase: PhaseKey): Promise<PhaseChecklistItem[]> {
  const { data, error } = await supabase
    .from('phase_checklist_items')
    .select('*')
    .eq('client_id', clientId)
    .eq('fase', fase)
    .order('orden', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PhaseChecklistItem[];
}

async function seedChecklist(clientId: string, fase: PhaseKey): Promise<void> {
  const rows = PHASE_CHECKLISTS[fase].map((tarea, i) => ({ client_id: clientId, fase, tarea, orden: i }));
  const { error } = await supabase.from('phase_checklist_items').insert(rows);
  if (error) throw error;
}

export async function startToriiOS(clientId: string): Promise<void> {
  const fase: PhaseKey = 'onboarding';
  const { error } = await supabase.from('delivery_phases').insert({
    client_id: clientId,
    fase,
    fecha_inicio: today(),
    tiempo_objetivo_dias: PHASE_DEFAULT_DAYS[fase],
  });
  if (error) throw error;
  await seedChecklist(clientId, fase);
}

export function nextPhaseOf(fase: PhaseKey): PhaseKey | null {
  const idx = PHASE_ORDER.indexOf(fase);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

// Closes the current phase (fecha_fin=today, objetivo_cumplido=true), opens
// the next one, and seeds its checklist — three writes, not wrapped in a DB
// transaction (no RPC for this yet), so a failure between steps can leave
// the phase closed without the next one created; the caller should refetch
// and surface that state rather than assume atomicity.
export async function advanceToNextPhase(clientId: string, current: DeliveryPhase): Promise<void> {
  const next = nextPhaseOf(current.fase);
  if (!next) throw new Error('Ya está en la última fase — no hay a dónde avanzar.');

  const { error: closeErr } = await supabase
    .from('delivery_phases')
    .update({ fecha_fin: today(), objetivo_cumplido: true })
    .eq('id', current.id);
  if (closeErr) throw closeErr;

  const { error: insertErr } = await supabase.from('delivery_phases').insert({
    client_id: clientId,
    fase: next,
    fecha_inicio: today(),
    tiempo_objetivo_dias: PHASE_DEFAULT_DAYS[next],
  });
  if (insertErr) throw insertErr;

  await seedChecklist(clientId, next);
}

export async function toggleChecklistItem(item: PhaseChecklistItem, completada: boolean): Promise<void> {
  const { error } = await supabase
    .from('phase_checklist_items')
    .update({ completada, fecha_completada: completada ? today() : null })
    .eq('id', item.id);
  if (error) throw error;
}
