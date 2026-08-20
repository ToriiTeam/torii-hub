-- Corrige ROAS/ROI de get_situacion_clientes: la versión anterior usaba
-- las cuotas pagadas por el cliente a Torii (client_installments) como
-- "ingresos", lo cual mezclaba el pago del cliente a Torii con su propio
-- ingreso generado. La columna real de monto por cierre en
-- client_closer_calls es "precio" (no existe columna "monto"; confirmado
-- via information_schema — client_closer_calls tiene precio numeric y
-- comision_estimada numeric, comision_estimada es la comisión de Torii
-- sobre la venta del cliente, no el ingreso del cliente).
--
-- Ingresos generados      = SUM(client_closer_calls.precio) WHERE cerro = true, por cliente.
-- ROAS = Ingresos generados / Inversión en ads (NULL si inversión = 0)
-- ROI  = Ingresos generados / (cuotas pagadas por el cliente a Torii + Inversión en ads) (NULL si denominador = 0)
CREATE OR REPLACE FUNCTION public.get_situacion_clientes()
 RETURNS TABLE(client_id uuid, client_name text, fecha_primer_pago date, fecha_inicio_campana date, fecha_proximo_pago date, ingresos numeric, inversion_ads numeric, roas numeric, roi numeric, cierres integer, agendas_efectivas integer, agendas_totales integer, close_rate numeric, show_up_rate numeric, dias_efectivos_ads integer, cuello_botella_activo text, dias_cuello_botella_activo integer)
 LANGUAGE sql
 STABLE
AS $function$
  WITH base AS (
    SELECT c.id, c.name, c.start_date, c.next_due_date
    FROM public.clients c
    WHERE c.es_interno = false
  ),
  pagos AS (
    SELECT ci.client_id,
           MIN(ci.paid_date) FILTER (WHERE ci.paid = true) AS fecha_primer_pago,
           COALESCE(SUM(ci.amount) FILTER (WHERE ci.paid = true), 0) AS cuotas_pagadas
    FROM public.client_installments ci
    GROUP BY ci.client_id
  ),
  ads_start AS (
    SELECT ac.client_id, MIN(amd.fecha) AS fecha_inicio_ads
    FROM public.ads_metricas_diarias amd
    JOIN public.ads_campanas ac ON ac.id = amd.campana_id
    GROUP BY ac.client_id
  ),
  ads_inv AS (
    SELECT ac.client_id, COALESCE(SUM(amd.inversion), 0) AS inversion_ads
    FROM public.ads_metricas_diarias amd
    JOIN public.ads_campanas ac ON ac.id = amd.campana_id
    GROUP BY ac.client_id
  ),
  calls AS (
    SELECT ccc.client_id,
           COUNT(*) FILTER (WHERE ccc.cerro = true)::int AS cierres,
           COUNT(*) FILTER (WHERE ccc.se_presento = true)::int AS agendas_efectivas,
           COUNT(*)::int AS agendas_totales,
           COALESCE(SUM(ccc.precio) FILTER (WHERE ccc.cerro = true), 0) AS ingresos_generados
    FROM public.client_closer_calls ccc
    WHERE ccc.client_id IS NOT NULL
    GROUP BY ccc.client_id
  ),
  cuello_activo AS (
    SELECT DISTINCT ON (cb.client_id)
           cb.client_id, cb.categoria, cb.fecha_inicio
    FROM public.cuellos_de_botella cb
    WHERE cb.estado = 'activo'
    ORDER BY cb.client_id, cb.fecha_inicio DESC
  )
  SELECT
    b.id,
    b.name,
    p.fecha_primer_pago,
    COALESCE(a.fecha_inicio_ads, b.start_date) AS fecha_inicio_campana,
    b.next_due_date,
    COALESCE(c.ingresos_generados, 0) AS ingresos,
    COALESCE(ai.inversion_ads, 0),
    CASE WHEN COALESCE(ai.inversion_ads, 0) > 0 THEN ROUND(COALESCE(c.ingresos_generados, 0) / ai.inversion_ads, 2) ELSE NULL END AS roas,
    CASE WHEN (COALESCE(ai.inversion_ads, 0) + COALESCE(p.cuotas_pagadas, 0)) > 0
         THEN ROUND(COALESCE(c.ingresos_generados, 0) / (COALESCE(ai.inversion_ads, 0) + COALESCE(p.cuotas_pagadas, 0)), 2)
         ELSE NULL END AS roi,
    COALESCE(c.cierres, 0),
    COALESCE(c.agendas_efectivas, 0),
    COALESCE(c.agendas_totales, 0),
    CASE WHEN COALESCE(c.agendas_totales, 0) > 0 THEN ROUND(c.cierres::numeric / c.agendas_totales, 3) ELSE NULL END AS close_rate,
    CASE WHEN COALESCE(c.agendas_totales, 0) > 0 THEN ROUND(c.agendas_efectivas::numeric / c.agendas_totales, 3) ELSE NULL END AS show_up_rate,
    CASE WHEN COALESCE(a.fecha_inicio_ads, b.start_date) IS NOT NULL
         THEN (CURRENT_DATE - COALESCE(a.fecha_inicio_ads, b.start_date))::int
         ELSE NULL END AS dias_efectivos_ads,
    ca.categoria AS cuello_botella_activo,
    CASE WHEN ca.fecha_inicio IS NOT NULL THEN (CURRENT_DATE - ca.fecha_inicio)::int ELSE NULL END AS dias_cuello_botella_activo
  FROM base b
  LEFT JOIN pagos p ON p.client_id = b.id
  LEFT JOIN ads_start a ON a.client_id = b.id
  LEFT JOIN ads_inv ai ON ai.client_id = b.id
  LEFT JOIN calls c ON c.client_id = b.id
  LEFT JOIN cuello_activo ca ON ca.client_id = b.id
  ORDER BY b.name;
$function$;
