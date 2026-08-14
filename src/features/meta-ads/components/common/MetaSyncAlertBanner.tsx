import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SyncResult {
  client_id: string;
  client_name: string;
  ok: boolean;
  rows_synced?: number;
  error?: string;
  error_code_190?: boolean;
}

interface MetaSyncRun {
  run_at: string;
  ok_count: number;
  error_count: number;
  results: SyncResult[];
  has_token_error: boolean;
}

// Muestra el estado de la última corrida de meta-ads-daily-sync (manual o
// del cron diario a las 12:00 UTC). Silencioso cuando todo salió bien —
// solo aparece si hay algo que requiere atención, y deja de mostrarse solo
// cuando la PRÓXIMA corrida sale limpia (no hay botón de descartar).
export function MetaSyncAlertBanner() {
  const [run, setRun] = useState<MetaSyncRun | null>(null);

  useEffect(() => {
    supabase
      .from('meta_sync_runs')
      .select('run_at, ok_count, error_count, results, has_token_error')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRun(data as unknown as MetaSyncRun | null));
  }, []);

  if (!run) return null;

  if (run.has_token_error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Token de Meta Ads vencido</AlertTitle>
        <AlertDescription>
          El token de Meta Ads venció — hay que renovarlo en Business Manager. El sync automático de campañas está fallando para los clientes afectados.
        </AlertDescription>
      </Alert>
    );
  }

  if (run.error_count > 0) {
    const failed = run.results.filter((r) => !r.ok);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Alert className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400 cursor-help">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Errores en el último sync de Meta Ads</AlertTitle>
            <AlertDescription>
              El último sync de Meta Ads tuvo errores en {run.error_count} cliente{run.error_count === 1 ? '' : 's'}.
            </AlertDescription>
          </Alert>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          {failed.map((r) => (
            <div key={r.client_id}>{r.client_name}: {r.error}</div>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
