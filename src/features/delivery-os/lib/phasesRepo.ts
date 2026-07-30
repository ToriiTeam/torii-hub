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

  try {
    await syncPortalActivePhase(clientId, fase);
  } catch (err) {
    console.error('[phasesRepo] Portal active_phase_id sync failed:', err);
  }
}

export function nextPhaseOf(fase: PhaseKey): PhaseKey | null {
  const idx = PHASE_ORDER.indexOf(fase);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

// Points client_portal_status.active_phase_id (the Portal-facing journey
// map) at the client_phases row matching `next` — client_phases now has
// the same 6 phases in the same order as PHASE_ORDER, so the match is by
// position (phase_order), not by name. Silently no-ops if the client
// doesn't have a Portal journey map seeded yet (client_phases/
// client_portal_status rows) — Torii OS phase advancement should never be
// blocked by whether the Portal has been activated for this client.
async function syncPortalActivePhase(clientId: string, next: PhaseKey): Promise<void> {
  const phaseOrder = PHASE_ORDER.indexOf(next) + 1;
  const { data: phase } = await supabase
    .from('client_phases')
    .select('id')
    .eq('client_id', clientId)
    .eq('phase_order', phaseOrder)
    .maybeSingle();
  if (!phase) return;

  await supabase
    .from('client_portal_status')
    .update({ active_phase_id: phase.id })
    .eq('client_id', clientId);
}

// Closes the current phase (fecha_fin=today, objetivo_cumplido=true), opens
// the next one, and seeds its checklist — three writes, not wrapped in a DB
// transaction (no RPC for this yet), so a failure between steps can leave
// the phase closed without the next one created; the caller should refetch
// and surface that state rather than assume atomicity. The Portal sync
// (4th step) is best-effort and never throws — a failure there shouldn't
// undo or block the Torii OS phase advancement itself.
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

  try {
    await syncPortalActivePhase(clientId, next);
  } catch (err) {
    console.error('[phasesRepo] Portal active_phase_id sync failed:', err);
  }
}

export async function toggleChecklistItem(item: PhaseChecklistItem, completada: boolean): Promise<void> {
  const { error } = await supabase
    .from('phase_checklist_items')
    .update({ completada, fecha_completada: completada ? today() : null })
    .eq('id', item.id);
  if (error) throw error;
}
