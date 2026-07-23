import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type FinanzasHistoryTable = 'incomes' | 'expenses' | 'debts' | 'finance_targets' | 'cash_opening_balance';

export interface FinanzasHistoryEntry {
  table: FinanzasHistoryTable;
  op: 'insert' | 'update' | 'delete';
  // Full row before the change — null for insert, since the row didn't
  // exist yet.
  before: Record<string, any> | null;
  // Full row after the change — null for delete, since the row no longer
  // exists. For insert this must be the row Supabase actually returned
  // (via .select().single()), not the client-side payload, so it carries
  // the generated id.
  after: Record<string, any> | null;
  // Lowercase, past-tense description of the forward action, e.g.
  // "ingreso de Adolfo Blasco $477 eliminado". The undo/redo toast
  // prefixes this with "Deshecho: " / "Rehecho: ".
  label: string;
}

// Call sites push already-typed rows (Income, Expense, Debt, …) into
// before/after, so this executor can't stay statically typed against
// Database's per-table Insert/Update/Row unions without a large
// discriminated-union rewrite — `as any` is scoped to just this function.
async function applyEntry(entry: FinanzasHistoryEntry, direction: 'undo' | 'redo'): Promise<{ error: unknown }> {
  const { table, op, before, after } = entry;
  const client = supabase.from(table) as any;
  const forward = direction === 'redo';

  if (op === 'insert') {
    if (forward) return client.insert(after);
    return client.delete().eq('id', after!.id);
  }
  if (op === 'delete') {
    if (forward) return client.delete().eq('id', before!.id);
    return client.insert(before);
  }
  // update
  const row = forward ? after! : before!;
  const { id, ...rest } = row;
  return client.update(rest).eq('id', id);
}

export interface UseFinanzasHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  pushHistory: (entry: FinanzasHistoryEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

// Global (not per-tab) undo/redo stack for Finanzas — one instance lives in
// Finanzas.tsx and is threaded down through FinanzasTabProps, so an insert
// in Ingresos and an edit in Egresos land in the same chronological stack,
// same as Excel's Ctrl+Z. In-memory only: a page reload clears it.
export function useFinanzasHistory(refetch: () => Promise<void>): UseFinanzasHistoryResult {
  const [undoStack, setUndoStack] = useState<FinanzasHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<FinanzasHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const pushHistory = useCallback((entry: FinanzasHistoryEntry) => {
    setUndoStack((prev) => [...prev, entry]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    if (busy || undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    setBusy(true);
    const { error } = await applyEntry(entry, 'undo');
    setBusy(false);
    if (error) { toast.error('Error al deshacer'); return; }
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);
    toast.info(`Deshecho: ${entry.label}`);
    await refetch();
  }, [busy, undoStack, refetch]);

  const redo = useCallback(async () => {
    if (busy || redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    setBusy(true);
    const { error } = await applyEntry(entry, 'redo');
    setBusy(false);
    if (error) { toast.error('Error al rehacer'); return; }
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);
    toast.info(`Rehecho: ${entry.label}`);
    await refetch();
  }, [busy, redoStack, refetch]);

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    busy,
    pushHistory,
    undo,
    redo,
  };
}
