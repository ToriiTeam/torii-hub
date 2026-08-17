ALTER TABLE public.clients
  ADD COLUMN comision_promedio_poliza numeric NOT NULL DEFAULT 500,
  ADD COLUMN ciclo_venta_semanas numeric NOT NULL DEFAULT 3,
  ADD COLUMN engage_ok boolean NOT NULL DEFAULT true;
