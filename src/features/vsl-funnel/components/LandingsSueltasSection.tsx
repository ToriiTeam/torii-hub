import { LandingVariantCard } from './LandingVariantCard';
import { AddLandingTile } from './AddLandingTile';
import type { LandingVariant } from '@/features/vsl-funnel/lib/vslFunnelRepo';

interface Props {
  variants: LandingVariant[];
  onAdd: () => void;
  onEdit: (v: LandingVariant) => void;
  onDelete: (v: LandingVariant) => void;
}

// landing_variants con vsl_entry_id NULL — landings compartidas por varios
// VSL distintos, o registradas sueltas antes de asociarlas a uno.
export function LandingsSueltasSection({ variants, onAdd, onEdit, onDelete }: Props) {
  return (
    <div className="pt-2">
      <h2 className="font-bold text-base mb-1">Landings sin VSL asociado</h2>
      <p className="text-xs text-muted-foreground mb-3">Casos donde una misma landing se usa con varios VSL distintos.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {variants.map((v) => (
          <LandingVariantCard key={v.id} variant={v} onEdit={() => onEdit(v)} onDelete={() => onDelete(v)} />
        ))}
        <AddLandingTile label="+ Agregar landing suelta" onClick={onAdd} />
      </div>
    </div>
  );
}
