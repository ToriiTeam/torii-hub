import { supabase } from '@/integrations/supabase/client';
import type { JSONContent } from '@tiptap/react';

export interface NotebookEntry {
  id: string;
  client_id: string;
  titulo: string;
  contenido: JSONContent | null;
  created_at: string;
  updated_at: string;
}

// Solo id/titulo/updated_at para la lista — el contenido completo (potencialmente
// pesado) se trae recién al abrir un documento puntual, ver fetchNotebookEntry.
export interface NotebookEntrySummary {
  id: string;
  titulo: string;
  updated_at: string;
}

export async function fetchNotebookEntries(clientId: string): Promise<NotebookEntrySummary[]> {
  const { data, error } = await supabase
    .from('client_notebook_entries')
    .select('id, titulo, updated_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchNotebookEntry(id: string): Promise<NotebookEntry> {
  const { data, error } = await supabase
    .from('client_notebook_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as NotebookEntry;
}

export async function createNotebookEntry(clientId: string, titulo: string): Promise<NotebookEntry> {
  const { data, error } = await supabase
    .from('client_notebook_entries')
    .insert({ client_id: clientId, titulo, contenido: null })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as NotebookEntry;
}

export async function updateNotebookEntry(id: string, input: { titulo: string; contenido: JSONContent }): Promise<void> {
  const { error } = await supabase
    .from('client_notebook_entries')
    .update({ titulo: input.titulo, contenido: input.contenido as never })
    .eq('id', id);
  if (error) throw error;
}
