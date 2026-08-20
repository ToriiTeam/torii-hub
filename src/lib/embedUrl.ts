// Embed/thumbnail URL helpers — ported 1:1 from torii-portal's
// ReportesPage.tsx / AdminClient.tsx. Shared by TabVideosDocs.tsx and
// TabPortalCreativos.tsx.

export function getYoutubeId(url: string): string | null {
  // e(?:mbed(?:ded)?)? cubre /e/, /embed/ y /embedded/ — el original solo
  // cubría /e/ y /embedded/, nunca /embed/ (el formato real que generan
  // casi todos los builders de landing), confirmado corriendo la función
  // contra un embed real antes de tocar esto.
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed(?:ded)?)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
}

export function getEmbedUrl(url: string): string {
  if (url.includes('youtu')) {
    const id = getYoutubeId(url);
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  }
  if (url.includes('loom.com/share')) {
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (match) return `https://www.loom.com/embed/${match[1]}?autoplay=1`;
  }
  return url;
}

export function getDriveEmbedUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return url;
}

export function getDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function getDriveThumbnailUrl(url: string): string {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i;

export function isDirectImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}
