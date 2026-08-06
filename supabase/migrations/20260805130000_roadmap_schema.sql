-- ═══════════════════════════════════════════════════════════════════════
-- Roadmap: el mapa de delivery de Torii, vivo y editable — no un documento
-- estático. 2 niveles:
--   roadmap_phases: definición de las 6 macro-fases (metodología), separada
--     de delivery_phases (que es la INSTANCIA por cliente de esas fases).
--     phase_key usa los mismos 6 valores que PhaseKey/PHASE_ORDER en
--     src/features/delivery-os/types.ts.
--   roadmap_processes: los procesos concretos dentro de cada fase (CSL
--     Master, Kickoff, guiones VSL, etc.), N por fase.
-- RLS sigue el mismo criterio que el resto de tablas operativas del Hub
-- (content_pillars, content_calendar, ...): FOR ALL USING(true) para
-- authenticated, gate real a nivel de página (isAdmin), no de policy — el
-- rol 'client' todavía no tiene ninguna pantalla del Hub habilitada.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.roadmap_phases (
  phase_key text PRIMARY KEY CHECK (phase_key IN (
    'onboarding', 'fundamentos', 'validacion_funnel',
    'validacion_ventas', 'optimizacion', 'maximizacion'
  )),
  nombre text NOT NULL,
  orden int NOT NULL,
  objetivo_fase text,
  trigger_entrada text,
  trigger_salida text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roadmap_phases IS
  'Definición viva de las 6 macro-fases de delivery (metodología), editable in-place desde el Hub. No confundir con delivery_phases (instancia por cliente).';

ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_phases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.roadmap_phases (phase_key, nombre, orden) VALUES
  ('onboarding', 'Onboarding', 1),
  ('fundamentos', 'Fundamentos', 2),
  ('validacion_funnel', 'Validación de Funnel', 3),
  ('validacion_ventas', 'Validación de Ventas', 4),
  ('optimizacion', 'Optimización', 5),
  ('maximizacion', 'Maximización', 6);

CREATE TABLE public.roadmap_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key text NOT NULL REFERENCES public.roadmap_phases(phase_key) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  objetivo text,
  cuando text,
  como_construirlo text,
  depende_de text,
  condiciona_a text,
  responsable text CHECK (responsable IS NULL OR responsable IN ('Torii', 'Cliente', 'Torii + Cliente')),
  done_criteria text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roadmap_processes IS
  'Procesos concretos dentro de cada macro-fase del roadmap de delivery. depende_de/condiciona_a son texto libre (prosa, no slugs), no referencias relacionales.';

CREATE INDEX idx_roadmap_processes_phase_key ON public.roadmap_processes(phase_key, orden);

ALTER TABLE public.roadmap_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_processes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
