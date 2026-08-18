-- A) Fix del modelo de tiempo: shows_esperados_be/verde y cierres_esperados_be
-- usaban mes_actual*4 (CEIL(dias/30)*4) como "semanas transcurridas" — un
-- cliente en día 4 ya contaba como mes 1 completo (4 semanas exigidas).
-- Pasa a semanas_transcurridas = dias_desde_arranque_real/7.0, continuo.
-- mes_actual se sigue calculando y devolviendo igual (uso informativo en el
-- tooltip), pero deja de alimentar estas fórmulas.
--
-- B) Estado de gracia en Entrega: antes de 7 días desde el arranque real,
-- entrega='Insuficientes datos' en vez de forzar Verde/OK/Bajo (mismo
-- espíritu que MINSHOWS ya aplica a Conversión). El veredicto contempla
-- la combinación entrega='Insuficientes datos' Y conversion='Sin data' →
-- veredicto='Insuficientes datos', evaluada después de engage_ok=false
-- (una alerta de engagement ya marcada por el staff pesa más que la falta
-- de datos). Si entrega='Insuficientes datos' pero conversion sí tiene
-- datos, cae en la misma rama que entrega='Bajo' (el veredicto lo decide
-- conversion, sin forzar "Insuficientes datos").
CREATE OR REPLACE FUNCTION public.get_scorecard_salud(p_client_id uuid)
RETURNS TABLE (
  client_id uuid,
  sin_campana boolean,
  effective_start_date date,
  dias_desde_arranque_real integer,
  mes_actual integer,
  pauta_acumulada numeric,
  comision numeric,
  ciclo_venta numeric,
  engage_ok boolean,
  shows_calif_acum integer,
  cierres_pago_acum integer,
  cierres_referido_acum integer,
  costo_total numeric,
  n_breakeven numeric,
  objetivo_verde numeric,
  shows_esperados_be numeric,
  shows_esperados_verde numeric,
  cierres_esperados_be numeric,
  close_rate_real numeric,
  entrega text,
  conversion text,
  veredicto text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_precio constant numeric := 3000;
  v_target constant numeric := 0.30;
  v_multverde constant numeric := 2;
  v_minshows constant integer := 5;
  v_convlim constant numeric := 0.20;
  v_semanas constant numeric := 12;
  v_min_dias_entrega constant integer := 7;

  v_effective_start_date date;
  v_dias_desde_arranque integer;
  v_mes_actual integer;
  v_pauta_acumulada numeric;
  v_comision numeric;
  v_ciclo_venta numeric;
  v_engage_ok boolean;
  v_shows_calif_acum integer;
  v_cierres_pago_acum integer;
  v_cierres_referido_acum integer;

  v_costo_total numeric;
  v_n_breakeven numeric;
  v_objetivo_verde numeric;
  v_den1 numeric;
  v_semanas_transcurridas numeric;
  v_min_term numeric;
  v_term2 numeric;
  v_min_term2 numeric;
  v_shows_esperados_be numeric;
  v_shows_esperados_verde numeric;
  v_cierres_esperados_be numeric;
  v_close_rate_real numeric;
  v_entrega text;
  v_conversion text;
  v_veredicto text;
BEGIN
  -- Fecha real de arranque: MIN(fecha) de ads_metricas_diarias del cliente,
  -- fallback a clients.start_date.
  SELECT MIN(amd.fecha)
  INTO v_effective_start_date
  FROM public.ads_metricas_diarias amd
  JOIN public.ads_campanas ac ON ac.id = amd.campana_id
  WHERE ac.client_id = p_client_id;

  IF v_effective_start_date IS NULL THEN
    SELECT c.start_date INTO v_effective_start_date
    FROM public.clients c
    WHERE c.id = p_client_id;
  END IF;

  IF v_effective_start_date IS NULL THEN
    RETURN QUERY SELECT
      p_client_id, true, NULL::date, NULL::integer, NULL::integer, NULL::numeric,
      NULL::numeric, NULL::numeric, NULL::boolean, NULL::integer, NULL::integer, NULL::integer,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric,
      NULL::numeric, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amd.inversion), 0)
  INTO v_pauta_acumulada
  FROM public.ads_metricas_diarias amd
  JOIN public.ads_campanas ac ON ac.id = amd.campana_id
  WHERE ac.client_id = p_client_id
    AND amd.fecha >= v_effective_start_date
    AND amd.fecha <= CURRENT_DATE;

  SELECT c.comision_promedio_poliza, c.ciclo_venta_semanas, c.engage_ok
  INTO v_comision, v_ciclo_venta, v_engage_ok
  FROM public.clients c
  WHERE c.id = p_client_id;

  v_dias_desde_arranque := CURRENT_DATE - v_effective_start_date;
  v_mes_actual := LEAST(3, GREATEST(1, CEIL(v_dias_desde_arranque / 30.0)))::integer;

  SELECT
    COUNT(*) FILTER (WHERE ccc.se_presento = true AND ccc.calificacion IS NOT NULL),
    COUNT(*) FILTER (WHERE ccc.cerro = true AND ccc.referido_id IS NULL),
    COUNT(*) FILTER (WHERE ccc.cerro = true AND ccc.referido_id IS NOT NULL)
  INTO v_shows_calif_acum, v_cierres_pago_acum, v_cierres_referido_acum
  FROM public.client_closer_calls ccc
  WHERE ccc.client_id = p_client_id;

  -- J6: =IF(E6="","",PRECIO+D6)
  IF v_comision IS NULL THEN
    v_costo_total := NULL;
  ELSE
    v_costo_total := v_precio + v_pauta_acumulada;
  END IF;

  -- K6: =IFERROR(IF(E6="","",J6/E6),"")
  v_n_breakeven := v_costo_total / NULLIF(v_comision, 0);

  -- L6: =IFERROR(K6*MULTVERDE,"")
  v_objetivo_verde := v_n_breakeven * v_multverde;

  v_den1 := GREATEST(v_semanas - v_ciclo_venta, 1);                    -- MAX(SEMANAS-F6,1)
  v_semanas_transcurridas := v_dias_desde_arranque / 7.0;              -- tiempo transcurrido continuo, no mes_actual*4
  v_min_term := LEAST(v_semanas_transcurridas, v_den1);

  -- M6 (adaptado): (K6/TARGET)/MAX(SEMANAS-F6,1)*MIN(semanas_transcurridas,MAX(SEMANAS-F6,1))
  v_shows_esperados_be := (v_n_breakeven / v_target) / v_den1 * v_min_term;

  -- N6 (adaptado)
  v_shows_esperados_verde := (v_objetivo_verde / v_target) / v_den1 * v_min_term;

  v_term2 := GREATEST(v_semanas_transcurridas - v_ciclo_venta, 0);
  v_min_term2 := LEAST(v_term2, v_den1);

  -- O6 (adaptado)
  v_cierres_esperados_be := v_target * (v_n_breakeven / v_target) / v_den1 * v_min_term2;

  -- P6: =IFERROR(IF(G6="","",H6/G6),"")
  v_close_rate_real := v_cierres_pago_acum::numeric / NULLIF(v_shows_calif_acum, 0);

  -- Q6 + estado de gracia: antes de v_min_dias_entrega días, no hay base
  -- para juzgar entrega todavía.
  IF v_dias_desde_arranque < v_min_dias_entrega THEN
    v_entrega := 'Insuficientes datos';
  ELSIF v_shows_esperados_verde IS NULL OR v_shows_esperados_be IS NULL THEN
    v_entrega := NULL;
  ELSIF v_shows_calif_acum >= v_shows_esperados_verde THEN
    v_entrega := 'Verde';
  ELSIF v_shows_calif_acum >= v_shows_esperados_be THEN
    v_entrega := 'OK';
  ELSE
    v_entrega := 'Bajo';
  END IF;

  -- R6: =IF(G6="","",IF(G6<MINSHOWS,"Sin data",IF(P6>=TARGET,"OK",IF(P6>=CONVLIM,"Límite","Bajo"))))
  IF v_shows_calif_acum < v_minshows THEN
    v_conversion := 'Sin data';
  ELSIF v_close_rate_real IS NULL THEN
    v_conversion := NULL;
  ELSIF v_close_rate_real >= v_target THEN
    v_conversion := 'OK';
  ELSIF v_close_rate_real >= v_convlim THEN
    v_conversion := 'Límite';
  ELSE
    v_conversion := 'Bajo';
  END IF;

  -- S6 + Insuficientes datos: engage_ok=false sigue primero (alerta ya
  -- marcada por el staff), después el caso "todavía no hay nada que juzgar".
  IF v_engage_ok IS FALSE THEN
    v_veredicto := 'AMARILLO — Engagement';
  ELSIF v_entrega = 'Insuficientes datos' AND v_conversion = 'Sin data' THEN
    v_veredicto := 'Insuficientes datos';
  ELSIF v_entrega IN ('Verde', 'OK') THEN
    IF v_conversion = 'OK' THEN
      v_veredicto := 'VERDE';
    ELSIF v_conversion = 'Sin data' THEN
      v_veredicto := 'Amarillo — poca data';
    ELSIF v_conversion = 'Límite' THEN
      v_veredicto := 'Amarillo — conversión al límite';
    ELSE
      v_veredicto := 'ROJO Conversión (asesor)';
    END IF;
  ELSE
    IF v_conversion IN ('OK', 'Límite') THEN
      v_veredicto := 'Amarillo — Entrega (Torii)';
    ELSIF v_conversion = 'Sin data' THEN
      v_veredicto := 'Amarillo — Entrega (Torii)';
    ELSE
      v_veredicto := 'ROJO Profundo';
    END IF;
  END IF;

  RETURN QUERY SELECT
    p_client_id, false, v_effective_start_date, v_dias_desde_arranque, v_mes_actual,
    v_pauta_acumulada, v_comision, v_ciclo_venta, v_engage_ok,
    v_shows_calif_acum, v_cierres_pago_acum, v_cierres_referido_acum,
    v_costo_total, v_n_breakeven, v_objetivo_verde,
    v_shows_esperados_be, v_shows_esperados_verde, v_cierres_esperados_be,
    v_close_rate_real, v_entrega, v_conversion, v_veredicto;
END;
$$;
