import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PeriodType, PresetKey } from '../../lib/periodRange';

interface PeriodSelectorProps {
  periodType: PeriodType;
  preset: PresetKey;
  monthLabel: string;
  customSince: string;
  customUntil: string;
  onPresetChange: (preset: PresetKey) => void;
  onModeChange: (mode: PeriodType) => void;
  onNavMonth: (dir: 'prev' | 'next') => void;
  onCustomChange: (since: string, until: string) => void;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'Todo' },
];

export function PeriodSelector({
  periodType, preset, monthLabel, customSince, customUntil,
  onPresetChange, onModeChange, onNavMonth, onCustomChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            variant="ghost"
            size="sm"
            className={cn('h-8 px-3 text-sm', periodType === 'preset' && preset === p.key && 'bg-primary text-primary-foreground hover:bg-primary/90')}
            onClick={() => onPresetChange(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <div className="w-px h-5 bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 px-3 text-sm', periodType === 'month' && 'bg-primary text-primary-foreground hover:bg-primary/90')}
          onClick={() => onModeChange('month')}
        >
          Mes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 px-3 text-sm', periodType === 'custom' && 'bg-primary text-primary-foreground hover:bg-primary/90')}
          onClick={() => onModeChange('custom')}
        >
          Personalizado
        </Button>
      </div>

      {periodType === 'month' && (
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 min-w-[140px] text-center">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {periodType === 'custom' && (
        <div className="flex items-center gap-2">
          <Input type="date" value={customSince} onChange={(e) => onCustomChange(e.target.value, customUntil)} className="bg-secondary/50 h-8 w-36 text-sm" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={customUntil} onChange={(e) => onCustomChange(customSince, e.target.value)} className="bg-secondary/50 h-8 w-36 text-sm" />
        </div>
      )}
    </div>
  );
}
