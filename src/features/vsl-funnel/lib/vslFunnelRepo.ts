import { supabase } from '@/integrations/supabase/client';
import type { JSONContent } from '@tiptap/react';
import { extractYoutubeFromHtml } from './extractYoutubeFromHtml';

export interface VslEntry {
  id: string;
  client_id: string;
  titulo: string;
  copy: string | null;
  codigo_pegado: string | null;
  video_embed_url: string | null;
  notas: string | null;
  hipotesis_doc: JSONContent | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  tracked_landing_id: string | null;
  updated_at: string;
}

export interface LandingVariant {
  id: string;
  client_id: string;
  vsl_entry_id: string | null;
  titulo: string;
  codigo_pegado: string | null;
  video_embed_url: string | null;
  tipo: 'estructura_completa' | 'solo_titular' | null;
  notas: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  updated_at: string;
}

export type VslEntryInput = Pick<VslEntry, 'titulo' | 'copy' | 'codigo_pegado' | 'notas' | 'hipotesis_doc' | 'fecha_desde' | 'fecha_hasta' | 'tracked_landing_id'>;
export type LandingVariantInput = Pick<LandingVariant, 'titulo' | 'codigo_pegado' | 'tipo' | 'notas' | 'fecha_desde' | 'fecha_hasta' | 'vsl_entry_id'>;

export async function fetchVslEntries(clientId: string): Promise<VslEntry[]> {
  const { data, error } = await supabase
    .from('vsl_entries')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VslEntry[];
}

export async function fetchLandingVariants(clientId: string): Promise<LandingVariant[]> {
  const { data, error } = await supabase
    .from('landing_variants')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LandingVariant[];
}

// Si codigo_pegado trae contenido, corre la extracción y pisa
// video_embed_url con el resultado; si no encuentra nada, deja el
// video_embed_url anterior tal cual (no lo borra) — mismo comportamiento
// pedido para alta y edición, en ambas tablas.
function withExtractedVideo<T extends { codigo_pegado: string | null }>(
  input: T,
  previousVideoEmbedUrl: string | null,
): T & { video_embed_url: string | null } {
  if (!input.codigo_pegado?.trim()) return { ...input, video_embed_url: previousVideoEmbedUrl };
  const extracted = extractYoutubeFromHtml(input.codigo_pegado);
  return { ...input, video_embed_url: extracted ?? previousVideoEmbedUrl };
}

export async function addVslEntry(clientId: string, input: VslEntryInput): Promise<VslEntry> {
  const payload = withExtractedVideo(input, null);
  const { data, error } = await supabase
    .from('vsl_entries')
    .insert({ client_id: clientId, ...payload })
    .select('*')
    .single();
  if (error) throw error;
  return data as VslEntry;
}

export async function updateVslEntry(id: string, input: VslEntryInput, previousVideoEmbedUrl: string | null): Promise<void> {
  const payload = withExtractedVideo(input, previousVideoEmbedUrl);
  const { error } = await supabase.from('vsl_entries').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteVslEntry(id: string): Promise<void> {
  const { error } = await supabase.from('vsl_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function addLandingVariant(clientId: string, input: LandingVariantInput): Promise<LandingVariant> {
  const payload = withExtractedVideo(input, null);
  const { data, error } = await supabase
    .from('landing_variants')
    .insert({ client_id: clientId, ...payload })
    .select('*')
    .single();
  if (error) throw error;
  return data as LandingVariant;
}

export async function updateLandingVariant(id: string, input: LandingVariantInput, previousVideoEmbedUrl: string | null): Promise<void> {
  const payload = withExtractedVideo(input, previousVideoEmbedUrl);
  const { error } = await supabase.from('landing_variants').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteLandingVariant(id: string): Promise<void> {
  const { error } = await supabase.from('landing_variants').delete().eq('id', id);
  if (error) throw error;
}
