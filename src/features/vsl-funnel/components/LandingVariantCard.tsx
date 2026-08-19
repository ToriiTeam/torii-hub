import { Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { LandingVariant } from '@/features/vsl-funnel/lib/vslFunnelRepo';

const TIPO_LABEL: Record<string, string> = {
  estructura_completa: 'Estructura completa',
  solo_titular: 'Solo titular',
};

const TIPO_CLASS: Record<string, string> = {
  estructura_completa: 'bg-info/15 text-info',
  solo_titular: 'bg-success/15 text-success',
};

function fmtDate(d: string) {
  return format(parseISO(d), 'dd/MM');
}

function activoDesdeHasta(fechaDesde: string | null, fechaHasta: string | null): string | null {
  if (!fechaDesde) return null;
  return fechaHasta ? `Activo del ${fmtDate(fechaDesde)} al ${fmtDate(fechaHasta)}` : `Activo desde ${fmtDate(fechaDesde)}`;
}

interface Props {
  variant: LandingVariant;
  onEdit: () => void;
  onDelete: () => void;
}

export function LandingVariantCard({ variant, onEdit, onDelete }: Props) {
  const activo = activoDesdeHasta(variant.fecha_desde, variant.fecha_hasta);
  return (
    <div className="relative bg-secondary/20 border border-border/50 rounded-xl p-3 group">
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="h-6 w-6 rounded-md border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground" title="Editar">
          <Pencil className="h-3 w-3" />
        </button>
        <button type="button" onClick={onDelete} className="h-6 w-6 rounded-md border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-destructive" title="Eliminar">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {variant.tipo && (
        <span className={cn('inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-2', TIPO_CLASS[variant.tipo])}>
          {TIPO_LABEL[variant.tipo]}
        </span>
      )}

      {variant.video_embed_url ? (
        <div className="aspect-video rounded-md overflow-hidden bg-black mb-2">
          <iframe src={variant.video_embed_url} className="w-full h-full pointer-events-none" title={variant.titulo} />
        </div>
      ) : (
        <div className="aspect-[16/10] rounded-md border border-dashed border-border/40 flex items-center justify-center text-[10px] text-muted-foreground mb-2">
          🖼 Sin video
        </div>
      )}

      <p className="text-xs font-semibold leading-snug">{variant.titulo}</p>
      {variant.notas && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{variant.notas}</p>}
      {activo && <p className="text-[10px] text-muted-foreground/70 mt-1">{activo}</p>}
    </div>
  );
}
