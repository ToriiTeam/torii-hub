import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import type { ReportMetrics } from '../../types';

interface MetricField {
  key: keyof ReportMetrics;
  label: string;
  suffix?: string;
}

const FIELDS: MetricField[] = [
  { key: 'inversionTotal', label: 'Inversión total ($)' },
  { key: 'impresiones', label: 'Impresiones' },
  { key: 'clics', label: 'Clics' },
  { key: 'leads', label: 'Leads' },
  { key: 'cpl', label: 'CPL ($)' },
  { key: 'cpmAprox', label: 'CPM aproximado ($)' },
  { key: 'reuniones', label: 'Reuniones agendadas' },
  { key: 'cpbc', label: 'CPBC ($)' },
  { key: 'cac', label: 'CAC ($)' },
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
  onGenerateNarrativa: () => void;
  generatingNarrativa: boolean;
}

export function Step2MetricsReview({
  metrics,
  autoFilled,
  loading,
  onChange,
  onReload,
  disabled,
  onGenerateNarrativa,
  generatingNarrativa,
}: Step2Props) {
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
              ? 'Auto-llenadas desde ads_metricas_diarias (Meta Ads) y client_closer_calls (Closing) — revisá y corregí si hace falta antes de continuar.'
              : 'Todavía no se auto-llenaron. Elegí cliente y mes en el paso anterior, o cargalas a mano.'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onReload} disabled={disabled || loading}>
          <RefreshCw className={loading ? 'h-4 w-4 mr-1 animate-spin' : 'h-4 w-4 mr-1'} />
          {loading ? 'Cargando…' : 'Auto-llenar de nuevo'}
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-4">
        {autoFilled && metrics.sinDatosMeta && (
          <p className="col-span-4 text-xs text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
            No hay datos de Meta Ads sincronizados para este cliente en este mes (ads_metricas_diarias vacío) — las métricas de inversión/leads quedaron en cero. Completalas a mano si las tenés de otra fuente.
          </p>
        )}
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

        <div className="col-span-4">
          <Separator className="mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Generar borrador con IA</p>
              <p className="text-xs text-muted-foreground">
                Usa estas métricas para pre-llenar el resumen, diagnóstico y recomendaciones de los pasos 3 a 5 — todo queda editable después.
              </p>
            </div>
            <Button variant="outline" onClick={onGenerateNarrativa} disabled={disabled || generatingNarrativa}>
              {generatingNarrativa ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {generatingNarrativa ? 'Generando…' : 'Generar borrador con IA'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
