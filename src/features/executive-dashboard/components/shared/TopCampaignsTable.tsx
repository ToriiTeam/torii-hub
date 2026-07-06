import { Badge } from '@/components/ui/badge';
import type { TopCampaign } from '../../types';

function ctrBadgeClass(ctr: number | null): string {
  if (ctr == null) return 'bg-secondary text-muted-foreground border-0';
  if (ctr >= 2) return 'bg-success/20 text-success border-0';
  if (ctr >= 1) return 'bg-warning/20 text-warning border-0';
  return 'bg-destructive/20 text-destructive border-0';
}

interface TopCampaignsTableProps {
  campaigns: TopCampaign[];
}

export function TopCampaignsTable({ campaigns }: TopCampaignsTableProps) {
  if (campaigns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Sin campañas con datos este período</p>;
  }
  const maxInversion = Math.max(...campaigns.map((c) => c.inversion), 1);

  return (
    <div className="space-y-3">
      {campaigns.map((c) => (
        <div key={c.nombre} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate max-w-[180px] font-medium">{c.nombre}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">{c.leads} leads</span>
              {c.ctr != null && <Badge className={ctrBadgeClass(c.ctr)}>{c.ctr.toFixed(1)}% CTR</Badge>}
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(c.inversion / maxInversion) * 100}%`, background: '#e5182b' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">${Math.round(c.inversion).toLocaleString()} invertidos · CPL ${c.cpl != null ? Math.round(c.cpl) : '—'}</p>
        </div>
      ))}
    </div>
  );
}
