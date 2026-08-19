import { cn } from '@/lib/utils';
import {
  veredictoColor, veredictoLabel, veredictoDetail, entregaLabel, conversionLabel,
  entregaSeverity, conversionSeverity, type ScorecardSalud, type VeredictoColor, type PillSeverity,
} from '@/features/clientes/lib/scorecardVeredicto';

const VEREDICTO_TEXT_CLASS: Record<VeredictoColor, string> = {
  verde: 'text-success',
  rojo: 'text-destructive',
  amarillo: 'text-warning',
  neutro: 'text-muted-foreground',
};

const PILL_CLASS: Record<PillSeverity, string> = {
  muybueno: 'bg-success/20 text-success',
  bueno: 'bg-success/10 text-success',
  critico: 'bg-destructive/15 text-destructive',
  neutro: 'bg-muted text-muted-foreground',
};

function Pill({ severity, children }: { severity: PillSeverity; children: React.ReactNode }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold', PILL_CLASS[severity])}>
      {children}
    </span>
  );
}

interface Props {
  scorecard: ScorecardSalud | undefined;
}

// Mismo veredicto que ya se usa en Vista Global (Clientes.tsx) y Delivery OS
// (ScorecardQuadrant) — get_scorecard_salud es la única fuente de "salud"
// real, sin carga manual. Este es el formato compacto para Ficha Operativa,
// donde entra en una card de una sola columna.
export function ScorecardSaludResumen({ scorecard }: Props) {
  if (!scorecard || scorecard.sin_campana) {
    return (
      <p className="text-sm text-muted-foreground" title={veredictoDetail(scorecard)}>
        {scorecard ? 'Sin campaña activa' : 'Calculando…'}
      </p>
    );
  }

  return (
    <div className="space-y-2.5" title={veredictoDetail(scorecard)}>
      <p className={cn('text-lg font-bold', VEREDICTO_TEXT_CLASS[veredictoColor(scorecard)])}>
        {veredictoLabel(scorecard)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Pill severity={entregaSeverity(scorecard.entrega)}>Entrega: {entregaLabel(scorecard.entrega)}</Pill>
        <Pill severity={conversionSeverity(scorecard.conversion, scorecard.close_rate_real)}>
          Conversión: {conversionLabel(scorecard.conversion, scorecard.close_rate_real)}
        </Pill>
      </div>
    </div>
  );
}
