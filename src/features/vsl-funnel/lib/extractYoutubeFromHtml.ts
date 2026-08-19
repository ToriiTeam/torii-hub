import { getYoutubeId } from '@/lib/embedUrl';

// Busca el primer <iframe> cuyo src apunte a un embed de YouTube dentro de
// un blob de HTML pegado a mano, y devuelve una URL de embed limpia. Regex
// simple sobre el string (no DOMParser) — no hay ningún parseo de HTML
// full-DOM en el resto del proyecto, y no hace falta acá: solo se busca un
// patrón de atributo. Reusa getYoutubeId (src/lib/embedUrl.ts) para el
// regex del ID en sí, en vez de duplicarlo.
export function extractYoutubeFromHtml(html: string): string | null {
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (!iframeMatch) return null;
  const src = iframeMatch[1];
  if (!src.includes('youtube.com/embed/') && !src.includes('youtube-nocookie.com/embed/')) return null;
  const id = getYoutubeId(src);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
