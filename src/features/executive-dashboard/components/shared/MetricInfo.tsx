import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MetricBreakdownRow {
  label: string;
  value: string;
}

export interface MetricInfoProps {
  // Plain-language description of what's being computed, e.g. "Suma de
  // client_closer_calls.precio donde owner_type='torii' y cerro=true,
  // dentro del rango de fecha aplicado."
  formula: string;
  // Source table(s), e.g. "client_closer_calls" or "incomes + expenses".
  source: string;
  // Which scope/filter (if any) currently governs this specific card — not
  // always a date range anymore: "Nuevo Torii" scopes money cards by
  // clients.oferta='Meta Ads Leadgen', closing-funnel cards by
  // fuente != 'LinkedIn' with no date bound at all, and some cards have no
  // extra filter at all (whole-business aggregates, or snapshot-today
  // counts). This makes explicit, per card, which one actually applies.
  scopeLabel: string;
  // Numerator/denominator (or other sub-components) with their current
  // resolved values, for compound formulas (CAC, ROAS, LTGP:CAC, etc.).
  breakdown?: MetricBreakdownRow[];
}

// Small ℹ️ icon + popover, meant to sit next to a card's label. Reusable so
// the ~30 numeric cards across ExecutiveDashboard/ToriiView/PortfolioView
// don't each hand-roll the same Popover/Info JSX.
export function MetricInfo({ formula, source, scopeLabel, breakdown }: MetricInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex text-muted-foreground/70 hover:text-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Cómo se calcula esta métrica"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" onClick={(e) => e.stopPropagation()}>
        <p className="leading-snug">{formula}</p>
        <div className="mt-2 pt-2 border-t border-border/60 space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground/80">Fuente:</span> {source}</p>
          <p><span className="font-medium text-foreground/80">Filtro:</span> {scopeLabel}</p>
        </div>
        {breakdown && breakdown.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
            {breakdown.map((b) => (
              <div key={b.label} className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-medium text-right">{b.value}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
