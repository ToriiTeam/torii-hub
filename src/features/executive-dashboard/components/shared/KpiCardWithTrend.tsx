import { Card, CardContent } from '@/components/ui/card';
import { Sparkline } from '@/features/meta-ads/components/common/Sparkline';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardWithTrendProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
  sparklineData?: number[]; // last N days, oldest→newest; omitted metrics render no sparkline
  sparklineColor?: string;
  prevValue?: number | null; // raw numeric previous-period value, for the delta badge
  currentValue?: number | null; // raw numeric current-period value
  higherIsBetter?: boolean; // controls delta badge color — default true
}

export function KpiCardWithTrend({
  label, value, icon: Icon, valueClassName, sparklineData, sparklineColor,
  prevValue, currentValue, higherIsBetter = true,
}: KpiCardWithTrendProps) {
  const hasDelta = prevValue != null && currentValue != null;
  const deltaPct = hasDelta && prevValue !== 0 ? Math.round(((currentValue! - prevValue!) / prevValue!) * 100) : null;
  const isUp = hasDelta && currentValue! >= prevValue!;
  const isGood = isUp === higherIsBetter;

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 text-center relative">
        <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
        <p className={cn('text-lg font-bold', valueClassName)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>

        <div className="flex items-center justify-center gap-2 mt-2 h-5">
          {hasDelta && deltaPct !== null && (
            <span className={cn('text-[11px] font-medium flex items-center gap-0.5', isGood ? 'text-success' : 'text-destructive')}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {deltaPct > 0 ? '+' : ''}{deltaPct}%
            </span>
          )}
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} width={44} height={16} color={sparklineColor} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
