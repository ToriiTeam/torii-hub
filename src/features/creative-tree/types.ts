export type CreativeTipo = 'video' | 'imagen' | 'carrusel' | 'texto';
export type CreativeEstado = 'en_test' | 'ganador' | 'perdedor' | 'pausado';

export interface CreativeNode {
  id: string;
  client_id: string | null;
  parent_id: string | null;
  nombre: string;
  angulo: string | null;
  hipotesis: string | null;
  tipo: CreativeTipo;
  estado: CreativeEstado;
  media_url: string | null;
  notas: string | null;
  position_x: number;
  position_y: number;
  created_at: string | null;
  updated_at: string | null;
}

export const TIPO_ICONS: Record<CreativeTipo, string> = {
  video: '🎬',
  imagen: '🖼',
  carrusel: '📱',
  texto: '📝',
};

export const TIPO_LABELS: Record<CreativeTipo, string> = {
  video: 'Video',
  imagen: 'Imagen',
  carrusel: 'Carrusel',
  texto: 'Texto',
};

export const ESTADO_LABELS: Record<CreativeEstado, string> = {
  en_test: 'En test',
  ganador: 'Ganador',
  perdedor: 'Perdedor',
  pausado: 'Pausado',
};

// Hex values (not Tailwind classes) because React Flow's edge `style` prop
// needs a real color string, not a class — reused for the node badges too
// so badge and edge colors always match for the same estado.
export const ESTADO_COLORS: Record<CreativeEstado, string> = {
  en_test: '#f59e0b',
  ganador: '#10b981',
  perdedor: '#ef4444',
  pausado: '#6b7280',
};

export const ESTADO_BADGE_CLASS: Record<CreativeEstado, string> = {
  en_test: 'bg-warning/20 text-warning',
  ganador: 'bg-success/20 text-success',
  perdedor: 'bg-destructive/20 text-destructive',
  pausado: 'bg-secondary text-muted-foreground',
};
