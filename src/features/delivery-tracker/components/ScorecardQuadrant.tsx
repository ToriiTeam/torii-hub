import { cn } from '@/lib/utils';
import { veredictoColor, veredictoDetail, type ScorecardSalud, type VeredictoColor } from '@/features/clientes/lib/scorecardVeredicto';
import { scorecardQuadrant, type QuadrantPosition } from '@/features/delivery-tracker/lib/quadrant';

const CELL_ORDER: QuadrantPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const ACTIVE_CELL_CLASS: Record<VeredictoColor, string> = {
  verde: 'bg-success/15 text-success border-success',
  rojo: 'bg-destructive/15 text-destructive border-destructive',
  amarillo: 'bg-warning/15 text-warning border-warning',
  neutro: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

interface Props {
  scorecard: ScorecardSalud | undefined;
}

// Cuadrante 2x2 "¿dónde está parado el cliente?" — eje Y = Entrega
// (arriba=buena), eje X = Conversión (derecha=buena). El mockup no traía
// lógica real acá (era un div marcado a mano); la convención está en
// quadrant.ts, confirmada con el cliente.
export function ScorecardQuadrant({ scorecard }: Props) {
  const active = scorecardQuadrant(scorecard);
  const color = veredictoColor(scorecard);

  return (
    <div
      className="grid grid-cols-2 gap-1 w-[110px] h-[110px] p-1 bg-secondary/30 border border-border/50 rounded-2xl flex-shrink-0"
      title={veredictoDetail(scorecard)}
    >
      {CELL_ORDER.map((cell) => (
        <div
          key={cell}
          className={cn(
            'rounded-lg flex items-center justify-center text-[9px] font-semibold bg-white/[0.03] text-transparent border border-transparent',
            active === cell && ACTIVE_CELL_CLASS[color],
          )}
        >
          {active === cell ? 'ACÁ' : ''}
        </div>
      ))}
    </div>
  );
}
