export type CreativeTipo = 'video' | 'imagen' | 'carrusel' | 'texto';

// Single unified vocabulary for the "win/lose/testing" concept, shared by
// hypothesis_history.resultado, angles.resultado, and creative_nodes.estado
// — previously 3 different word sets (gano/perdio/inconcluso vs.
// ganador/perdedor/en_test/sin_datos vs. en_test/ganador/perdedor/pausado).
// 'pausado' made the cut (not folded into 'en_test') because creative_nodes
// already had 5 real rows using it as a distinct operational state at the
// time of unification — a genuine "paused, not actively testing, not
// concluded" state, not just a naming variant of 'en_test'. 'sin_datos'
// (angles' old 4th value) was retired instead: it had zero real rows and
// duplicates what a NULL resultado already means, so the column being
// nullable covers that case without a dedicated enum value.
export type ResultadoEstado = 'en_test' | 'ganador' | 'perdedor' | 'inconcluso' | 'pausado';
export const RESULTADO_LABELS: Record<ResultadoEstado, string> = {
  en_test: 'En test', ganador: 'Ganador', perdedor: 'Perdedor', inconcluso: 'Inconcluso', pausado: 'Pausado',
};
export const RESULTADO_COLORS: Record<ResultadoEstado, string> = {
  en_test: '#f59e0b', ganador: '#10b981', perdedor: '#ef4444', inconcluso: '#8b5cf6', pausado: '#6b7280',
};
export const RESULTADO_BADGE_CLASS: Record<ResultadoEstado, string> = {
  en_test: 'bg-warning/20 text-warning', ganador: 'bg-success/20 text-success',
  perdedor: 'bg-destructive/20 text-destructive', inconcluso: 'bg-info/20 text-info',
  pausado: 'bg-secondary text-muted-foreground',
};

// Aliases kept so existing call sites (CreativeDetailPanel.tsx, etc.) don't
// need every reference renamed — both are now the exact same type/values.
export type CreativeEstado = ResultadoEstado;
export type HypothesisResultado = ResultadoEstado;
export const HYPOTHESIS_RESULTADO_LABELS = RESULTADO_LABELS;

export interface HypothesisHistoryEntry {
  id: string;
  client_id: string | null;
  angle_id: string | null;
  creative_node_id: string | null;
  hipotesis: string | null;
  fecha_inicio: string | null;
  fecha_cierre: string | null;
  resultado: HypothesisResultado | null;
  aprendizaje: string | null;
  metricas_inicio: unknown | null;
  metricas_fin: unknown | null;
  created_at: string | null;
}

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

export const ESTADO_LABELS = RESULTADO_LABELS;

// Hex values (not Tailwind classes) because React Flow's edge `style` prop
// needs a real color string, not a class — reused for the node badges too
// so badge and edge colors always match for the same estado.
export const ESTADO_COLORS = RESULTADO_COLORS;

export const ESTADO_BADGE_CLASS = RESULTADO_BADGE_CLASS;
