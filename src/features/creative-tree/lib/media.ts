import { supabase } from '@/integrations/supabase/client';

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';

export function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (IMAGE_EXTENSION_RE.test(url)) return true;
  // Images uploaded via uploadCreativeImage() below, even if the filename
  // itself has no recognizable extension.
  return url.includes('/storage/v1/object/public/creative-images/');
}

export async function uploadCreativeImage(clientId: string, nodeId: string, file: File): Promise<string> {
  const path = `${clientId}/creativos/${nodeId}_${file.name}`;
  const { error } = await supabase.storage
    .from('creative-images')
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('creative-images').getPublicUrl(path);
  return data.publicUrl;
}
