// Shared between TabPilares (pillar cards) and TabBitacora (pillar badge
// per hypothesis row) — extracted here instead of duplicated, since both
// need the same nombre→color mapping.
export const PILLAR_STYLE: Record<string, { border: string; badge: string; accent: string }> = {
  'Adquisición': { border: 'border-info/40', badge: 'bg-info/20 text-info', accent: 'text-info' },
  'Cierre':      { border: 'border-warning/40', badge: 'bg-warning/20 text-warning', accent: 'text-warning' },
  'Autoridad':   { border: 'border-primary/40', badge: 'bg-primary/20 text-primary', accent: 'text-primary' },
};
export const DEFAULT_PILLAR_STYLE = { border: 'border-border/50', badge: 'bg-secondary text-muted-foreground', accent: 'text-foreground' };

export function pillarStyle(nombre: string) {
  return PILLAR_STYLE[nombre] ?? DEFAULT_PILLAR_STYLE;
}
