import { Plus } from 'lucide-react';

export function AddLandingTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[150px] rounded-xl border-[1.5px] border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-muted-foreground text-xs transition-colors"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
