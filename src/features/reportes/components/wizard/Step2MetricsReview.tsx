import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import type { ReportMetrics } from '../../types';

interface MetricField {
  key: keyof ReportMetrics;
  label: string;
  suffix?: string;
}

const FIELDS: MetricField[] = [
  { key: 'inversionTotal', label: 'Inversión total ($)' },
  { key: 'leads', label: 'Leads' },
  { key: 'cpl', label: 'CPL ($)' },
  { key: 'reuniones', label: 'Reuniones agendadas' },
  { key: 'cpbc', label: 'CPBC ($)' },
  { key: 'conversionLeadReunion', label: 'Conversión lead → reunión (%)' },
  { key: 'showRate', label: 'Show rate (%)' },
  { key: 'cierres', label: 'Cierres' },
];

interface Step2Props {
  metrics: ReportMetrics;
  autoFilled: boolean;
  loading: boolean;
  onChange: (metrics: ReportMetrics) => void;
  onReload: () => void;
  disabled: boolean;
}

export function Step2MetricsReview({ metrics, autoFilled, loading, onChange, onReload, disabled }: Step2Props) {
  function update(key: keyof ReportMetrics, raw: string) {
    const value = raw === '' ? null : Number(raw);
    onChange({ ...metrics, [key]: value });
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Métricas del período</CardTitle>
          <CardDescription>
            {autoFilled
              ? 'Auto-llenadas desde client_metrics — revisá y corregí si hace falta antes de continuar.'
              : 'Todavía no se auto-llenaron. Elegí cliente y mes en el paso anterior, o cargalas a mano.'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onReload} disabled={disabled || loading}>
          <RefreshCw className={loading ? 'h-4 w-4 mr-1 animate-spin' : 'h-4 w-4 mr-1'} />
          {loading ? 'Cargando…' : 'Auto-llenar de nuevo'}
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              type="number"
              value={metrics[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
              className="bg-secondary/50"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
