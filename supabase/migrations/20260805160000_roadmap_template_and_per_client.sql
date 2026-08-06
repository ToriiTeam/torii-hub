-- ═══════════════════════════════════════════════════════════════════════
-- Reconstrucción completa del Roadmap:
--   1) roadmap_phases/roadmap_processes (metodología única) → renombradas
--      a _template, sin perder contenido.
--   2) Los 5 roadmap_cycles/roadmap_cycle_nodes se pliegan DENTRO de
--      roadmap_processes_template como procesos especiales (es_ciclo=true
--      + parent_process_id) — un solo modelo, un solo panel de detalle,
--      en vez de un modelo de ciclos separado.
--   3) roadmap_phases/roadmap_processes NUEVAS, con client_id — la
--      instancia editable por cliente, activada copiando desde el
--      template (mismo patrón que "Activar Portal" en
--      TabPortalCliente.tsx). Ganan sub-pasos (roadmap_process_steps),
--      status+fechas reales, y dependencias relacionales
--      (roadmap_process_dependencies) además del texto libre existente.
--   4) roadmap_documents + bucket 'roadmap-documents' para SOPs/playbooks.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Rename: el template preserva el contenido real ya cargado ──────
ALTER TABLE public.roadmap_phases RENAME TO roadmap_phases_template;
ALTER TABLE public.roadmap_processes RENAME TO roadmap_processes_template;

ALTER TABLE public.roadmap_processes_template ALTER COLUMN phase_key DROP NOT NULL;
ALTER TABLE public.roadmap_processes_template ADD COLUMN es_ciclo boolean NOT NULL DEFAULT false;
ALTER TABLE public.roadmap_processes_template ADD COLUMN parent_process_id uuid REFERENCES public.roadmap_processes_template(id) ON DELETE CASCADE;
-- Semilla del status inicial cuando se active un cliente — NULL = usar el
-- default 'no_iniciado' de roadmap_processes.status. Solo Testeo de VSL
-- necesita arrancar en otro estado (confirmado: badge "en definición" →
-- status='bloqueado' + nota en el campo cuando).
ALTER TABLE public.roadmap_processes_template ADD COLUMN default_status text
  CHECK (default_status IS NULL OR default_status IN ('no_iniciado', 'en_curso', 'completado', 'bloqueado'));

-- Limpieza: fila de prueba creada al probar el botón "Agregar proceso" de
-- la UI anterior — nunca fue contenido real, no se migra.
DELETE FROM public.roadmap_processes_template WHERE id = 'f3a989ed-e59a-45c5-98d2-6bc2d576c1a7';

-- ─── 2. Backfill: los 5 ciclos pasan a ser procesos especiales ─────────
INSERT INTO public.roadmap_processes_template (phase_key, nombre, orden, objetivo, cuando, es_ciclo, default_status)
SELECT
  c.phase_key,
  c.nombre,
  c.orden,
  c.descripcion,
  CASE WHEN c.key = 'testeo_vsl' THEN 'Todavía sin presupuesto ni cadencia definidos.' END,
  true,
  CASE WHEN c.key = 'testeo_vsl' THEN 'bloqueado' END
FROM public.roadmap_cycles c;

INSERT INTO public.roadmap_processes_template (phase_key, nombre, orden, objetivo, done_criteria, es_ciclo, parent_process_id)
SELECT
  parent.phase_key,
  n.nombre,
  n.orden,
  n.descripcion,
  n.output,
  false,
  parent.id
FROM public.roadmap_cycle_nodes n
JOIN public.roadmap_cycles c ON c.id = n.cycle_id
JOIN public.roadmap_processes_template parent
  ON parent.es_ciclo = true
  AND parent.nombre = c.nombre
  AND (parent.phase_key = c.phase_key OR (parent.phase_key IS NULL AND c.phase_key IS NULL));

DROP TABLE public.roadmap_cycle_nodes;
DROP TABLE public.roadmap_cycles;

-- ─── 3. Instancia por cliente (nueva) ───────────────────────────────────
CREATE TABLE public.roadmap_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_key text NOT NULL,
  nombre text NOT NULL,
  orden int NOT NULL,
  objetivo_fase text,
  trigger_entrada text,
  trigger_salida text,
  activated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, phase_key)
);
CREATE INDEX idx_roadmap_phases_client ON public.roadmap_phases(client_id, orden);
ALTER TABLE public.roadmap_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_phases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.roadmap_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
  template_process_id uuid REFERENCES public.roadmap_processes_template(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  objetivo text,
  cuando text,
  como_construirlo text,
  depende_de text,
  condiciona_a text,
  responsable text CHECK (responsable IS NULL OR responsable IN ('Torii', 'Cliente', 'Torii + Cliente')),
  done_criteria text,
  es_ciclo boolean NOT NULL DEFAULT false,
  parent_process_id uuid REFERENCES public.roadmap_processes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'no_iniciado' CHECK (status IN ('no_iniciado', 'en_curso', 'completado', 'bloqueado')),
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_roadmap_processes_client_phase ON public.roadmap_processes(client_id, phase_id, orden);
CREATE INDEX idx_roadmap_processes_parent ON public.roadmap_processes(parent_process_id);
ALTER TABLE public.roadmap_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_processes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.roadmap_process_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.roadmap_processes(id) ON DELETE CASCADE,
  texto text NOT NULL,
  completado boolean NOT NULL DEFAULT false,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_roadmap_process_steps_process ON public.roadmap_process_steps(process_id, orden);
ALTER TABLE public.roadmap_process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_process_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Arranca vacía en todos los casos (nueva instancia o nuevo proceso) — sin
-- inferencia automática desde el texto libre depende_de/condiciona_a,
-- confirmado: se carga a mano desde el panel.
CREATE TABLE public.roadmap_process_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.roadmap_processes(id) ON DELETE CASCADE,
  depends_on_process_id uuid NOT NULL REFERENCES public.roadmap_processes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_id, depends_on_process_id),
  CHECK (process_id <> depends_on_process_id)
);
ALTER TABLE public.roadmap_process_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_process_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.roadmap_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.roadmap_phases(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.roadmap_processes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('sop', 'playbook', 'documento')),
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_roadmap_documents_client ON public.roadmap_documents(client_id);
ALTER TABLE public.roadmap_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.roadmap_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. Storage bucket para SOPs/playbooks/documentos ──────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('roadmap-documents', 'roadmap-documents', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can read roadmap documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'roadmap-documents');
CREATE POLICY "Authenticated can manage roadmap documents" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'roadmap-documents') WITH CHECK (bucket_id = 'roadmap-documents');
