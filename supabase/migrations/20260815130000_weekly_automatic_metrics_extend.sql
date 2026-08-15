-- Extiende get_weekly_automatic_metrics para calcular calificados_closer,
-- cerrados, tasa_calificacion y tasa_cierre a partir de client_closer_calls
-- (columnas califico/cerro, ya existentes, nunca antes usadas por este RPC).
-- Estos 4 valores pasan de ser tipeados a mano en AdminClient.tsx a
-- automáticos, igual que los otros 9 campos que este RPC ya calculaba.
-- Fórmulas confirmadas: tasa_calificacion = calificados/agendas_generadas
-- (mismo criterio que ya usa torii-portal en otro lado), tasa_cierre =
-- cerrados/calificados.
DROP FUNCTION IF EXISTS public.get_weekly_automatic_metrics(uuid, date, date);

CREATE FUNCTION public.get_weekly_automatic_metrics(p_client_id uuid, p_week_start date, p_week_end date)
 RETURNS TABLE(
   inversion numeric, leads integer, calificados integer, cpl numeric, cpbc numeric,
   agendas_generadas integer, llamadas_realizadas integer, no_shows integer, show_rate numeric,
   calificados_closer integer, cerrados integer, tasa_calificacion numeric, tasa_cierre numeric
 )
 LANGUAGE sql
 STABLE
AS $function$
  WITH ads AS (
    SELECT
      COALESCE(SUM(m.inversion), 0) AS inversion,
      COALESCE(SUM(m.leads), 0)::int AS leads,
      COALESCE(SUM(m.calificados), 0)::int AS calificados
    FROM ads_metricas_diarias m
    JOIN ads_campanas c ON c.id = m.campana_id
    WHERE c.client_id = p_client_id AND m.fecha BETWEEN p_week_start AND p_week_end
  ),
  calls AS (
    SELECT
      COUNT(*) FILTER (WHERE fecha_llamada BETWEEN p_week_start AND p_week_end) AS agendas_generadas,
      COUNT(*) FILTER (WHERE fecha_llamada BETWEEN p_week_start AND p_week_end AND se_presento = true) AS llamadas_realizadas,
      COUNT(*) FILTER (WHERE fecha_llamada BETWEEN p_week_start AND p_week_end AND se_presento = false AND fecha_llamada <= CURRENT_DATE) AS no_shows,
      COUNT(*) FILTER (WHERE fecha_llamada BETWEEN p_week_start AND p_week_end AND califico = true) AS calificados_closer,
      COUNT(*) FILTER (WHERE fecha_llamada BETWEEN p_week_start AND p_week_end AND cerro = true) AS cerrados
    FROM client_closer_calls
    WHERE client_id = p_client_id AND owner_type = 'client'
  )
  SELECT
    ads.inversion, ads.leads, ads.calificados,
    CASE WHEN ads.leads > 0 THEN ROUND(ads.inversion / ads.leads, 2) END,
    CASE WHEN ads.calificados > 0 THEN ROUND(ads.inversion / ads.calificados, 2) END,
    calls.agendas_generadas::int, calls.llamadas_realizadas::int, calls.no_shows::int,
    CASE WHEN calls.agendas_generadas > 0 THEN ROUND(calls.llamadas_realizadas::numeric / calls.agendas_generadas * 100, 1) END,
    calls.calificados_closer::int,
    calls.cerrados::int,
    CASE WHEN calls.agendas_generadas > 0 THEN ROUND(calls.calificados_closer::numeric / calls.agendas_generadas * 100, 1) END AS tasa_calificacion,
    CASE WHEN calls.calificados_closer > 0 THEN ROUND(calls.cerrados::numeric / calls.calificados_closer * 100, 1) END AS tasa_cierre
  FROM ads, calls;
$function$;
