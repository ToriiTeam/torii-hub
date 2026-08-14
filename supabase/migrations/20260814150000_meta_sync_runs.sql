-- Registro de cada corrida de la Edge Function meta-ads-daily-sync (manual o
-- por el cron programado a las 12:00 UTC), para que un fallo — sobre todo un
-- token de Meta vencido (código 190) — quede visible en el Hub en vez de
-- perderse en los logs de la función.
CREATE TABLE public.meta_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  ok_count int NOT NULL,
  error_count int NOT NULL,
  results jsonb NOT NULL,
  has_token_error boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.meta_sync_runs IS
  'Un resumen por corrida de meta-ads-daily-sync. results guarda el array results[] completo devuelto por la función (client_id, client_name, ok, rows_synced/error/error_code_190 por cliente). has_token_error = true si algún elemento de results trae error_code_190: true.';

CREATE INDEX idx_meta_sync_runs_run_at ON public.meta_sync_runs(run_at DESC);

ALTER TABLE public.meta_sync_runs ENABLE ROW LEVEL SECURITY;

-- Igual patrón que client_closer_calls / referidos: staff interno sí, pero
-- ni auditor (esto no es información de cierre de ventas) ni client (la fila
-- trae nombres y errores de TODOS los clientes, no solo el propio).
CREATE POLICY "staff no-auditor no-client puede todo" ON public.meta_sync_runs
  FOR ALL
  USING ((NOT has_role(auth.uid(), 'auditor'::app_role)) AND (NOT has_role(auth.uid(), 'client'::app_role)))
  WITH CHECK ((NOT has_role(auth.uid(), 'auditor'::app_role)) AND (NOT has_role(auth.uid(), 'client'::app_role)));
