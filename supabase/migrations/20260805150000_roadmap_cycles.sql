-- ═══════════════════════════════════════════════════════════════════════
-- Ciclos del roadmap: loops de 3 nodos (Descubrimiento → Explotación/
-- Presentación → Optimización/Cierre → vuelve al inicio) anidados dentro
-- de una fase (roadmap_phases), salvo el operativo semanal que corre en
-- paralelo sin fase. Metodología fija, no datos en vivo de un cliente —
-- eso lo cubre creative_nodes (Árbol de Iteraciones) por cliente.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE public.roadmap_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key text REFERENCES public.roadmap_phases(phase_key) ON DELETE CASCADE,
  key text NOT NULL UNIQUE,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'definido' CHECK (status IN ('definido', 'en_definicion')),
  cadence text,
  descripcion text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roadmap_cycles IS
  'Ciclos de 3 nodos en loop del roadmap de delivery. phase_key NULL = ciclo operativo recurrente, no anidado en ninguna fase.';

CREATE INDEX idx_roadmap_cycles_phase_key ON public.roadmap_cycles(phase_key, orden);

ALTER TABLE public.roadmap_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_cycles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.roadmap_cycle_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.roadmap_cycles(id) ON DELETE CASCADE,
  orden int NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  output text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roadmap_cycle_nodes_cycle_id ON public.roadmap_cycle_nodes(cycle_id, orden);

ALTER TABLE public.roadmap_cycle_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_cycle_nodes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Seed ────────────────────────────────────────────────────────────────

INSERT INTO public.roadmap_cycles (phase_key, key, nombre, orden, status, cadence, descripcion) VALUES
  ('validacion_funnel', 'media_buying', 'Media Buying', 1, 'definido', NULL, NULL),
  ('validacion_funnel', 'testeo_vsl', 'Testeo de VSL', 2, 'en_definicion', NULL, 'Todavía no tiene presupuesto ni cadencia definidos.'),
  ('validacion_ventas', 'ciclo_1', 'Ciclo 1', 1, 'definido', NULL, NULL),
  ('validacion_ventas', 'ciclo_2', 'Ciclo 2', 2, 'definido', NULL, 'Retoma el Ciclo 1 con mayor profundidad.'),
  (NULL, 'operativo_semanal', 'Ciclo operativo recurrente', 1, 'definido', 'Semanal', NULL);

INSERT INTO public.roadmap_cycle_nodes (cycle_id, orden, nombre, descripcion, output)
SELECT id, 1, 'Descubrimiento', 'Exploración barata de ángulos', NULL FROM public.roadmap_cycles WHERE key = 'media_buying'
UNION ALL
SELECT id, 2, 'Explotación', 'Concentración a volumen', 'Anuncio Ganador' FROM public.roadmap_cycles WHERE key = 'media_buying'
UNION ALL
SELECT id, 3, 'Optimización', 'Aislar variables: framework, formato, hook, creatividad, CTA', 'Ángulo Ganador' FROM public.roadmap_cycles WHERE key = 'media_buying'

UNION ALL
SELECT id, 1, 'Descubrimiento', 'Guiones, estructuras y titulares distintos', NULL FROM public.roadmap_cycles WHERE key = 'testeo_vsl'
UNION ALL
SELECT id, 2, 'Explotación', 'Concentración en el VSL candidato', NULL FROM public.roadmap_cycles WHERE key = 'testeo_vsl'
UNION ALL
SELECT id, 3, 'Optimización', 'Aislar variables del VSL ganador', NULL FROM public.roadmap_cycles WHERE key = 'testeo_vsl'

UNION ALL
SELECT id, 1, 'Descubrimiento', NULL, NULL FROM public.roadmap_cycles WHERE key = 'ciclo_1'
UNION ALL
SELECT id, 2, 'Presentación', NULL, NULL FROM public.roadmap_cycles WHERE key = 'ciclo_1'
UNION ALL
SELECT id, 3, 'Objeciones y Cierre', NULL, NULL FROM public.roadmap_cycles WHERE key = 'ciclo_1'

UNION ALL
SELECT id, 1, 'Descubrimiento avanzado', NULL, NULL FROM public.roadmap_cycles WHERE key = 'ciclo_2'
UNION ALL
SELECT id, 2, 'Microcompromisos', NULL, NULL FROM public.roadmap_cycles WHERE key = 'ciclo_2'
UNION ALL
SELECT id, 3, 'Resolución de situaciones', NULL, NULL FROM public.roadmap_cycles WHERE key = 'ciclo_2'

UNION ALL
SELECT id, 1, 'Revisión Interna', NULL, NULL FROM public.roadmap_cycles WHERE key = 'operativo_semanal'
UNION ALL
SELECT id, 2, 'Revisión Cliente', NULL, NULL FROM public.roadmap_cycles WHERE key = 'operativo_semanal'
UNION ALL
SELECT id, 3, 'Revisión Recurrente', NULL, NULL FROM public.roadmap_cycles WHERE key = 'operativo_semanal';
