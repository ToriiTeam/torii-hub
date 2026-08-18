import { entregaSeverity, conversionSeverity, type ScorecardSalud } from '@/features/clientes/lib/scorecardVeredicto';

// El mockup no trae lógica real para el cuadrante 2x2 (era un div marcado
// "active" a mano) — esta es la convención acordada: eje Y = Entrega
// (arriba=buena, abajo=crítica), eje X = Conversión (izquierda=crítica,
// derecha=buena). "Insuficientes datos" en cualquiera de los dos ejes no
// resalta ningún cuadrante — no hay base para ubicar al cliente todavía.
export type QuadrantPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;

export function scorecardQuadrant(scorecard: ScorecardSalud | undefined): QuadrantPosition {
  if (!scorecard || scorecard.sin_campana) return null;
  const entrega = entregaSeverity(scorecard.entrega);
  const conversion = conversionSeverity(scorecard.conversion, scorecard.close_rate_real);
  if (entrega === 'neutro' || conversion === 'neutro') return null;

  const entregaBuena = entrega === 'muybueno' || entrega === 'bueno';
  const conversionBuena = conversion === 'muybueno' || conversion === 'bueno';

  if (entregaBuena && conversionBuena) return 'top-right';
  if (entregaBuena && !conversionBuena) return 'top-left';
  if (!entregaBuena && conversionBuena) return 'bottom-right';
  return 'bottom-left';
}
