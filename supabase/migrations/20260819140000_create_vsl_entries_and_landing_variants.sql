CREATE TABLE public.vsl_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  copy text,
  codigo_pegado text,
  video_embed_url text,
  notas text,
  hipotesis_doc jsonb,
  fecha_desde date,
  fecha_hasta date,
  -- Landing real (tracked_landings) que este VSL usa para el mini-resumen
  -- de métricas y el link a /vsl-tracking — opcional, ver
  -- VslMetricasResumen.tsx. NULL = sin landing registrada todavía, el
  -- resto del VSL entry funciona igual sin este dato.
  tracked_landing_id uuid REFERENCES public.tracked_landings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.landing_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vsl_entry_id uuid REFERENCES public.vsl_entries(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  codigo_pegado text,
  video_embed_url text,
  tipo text CHECK (tipo IN ('estructura_completa', 'solo_titular')),
  notas text,
  fecha_desde date,
  fecha_hasta date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vsl_entries_client_id ON public.vsl_entries (client_id);
CREATE INDEX idx_landing_variants_client_id ON public.landing_variants (client_id);
CREATE INDEX idx_landing_variants_vsl_entry_id ON public.landing_variants (vsl_entry_id);

ALTER TABLE public.vsl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.vsl_entries
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.landing_variants
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));
