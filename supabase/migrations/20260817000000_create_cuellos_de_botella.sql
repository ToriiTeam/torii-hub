CREATE TABLE public.cuellos_de_botella (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  roadmap_process_id uuid REFERENCES public.roadmap_processes(id) ON DELETE SET NULL,
  categoria text NOT NULL CHECK (categoria IN (
    'Media Buying / Anuncios',
    'VSL / Landing',
    'Agendamiento / Show up',
    'Ventas / Cierre',
    'Configuración técnica',
    'Cliente / Relación'
  )),
  motivo text NOT NULL,
  plan_contingencia text NOT NULL,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'resuelto', 'descartado')),
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_resolucion date,
  resultado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cuellos_de_botella_client_id ON public.cuellos_de_botella (client_id);
CREATE INDEX idx_cuellos_de_botella_roadmap_process_id ON public.cuellos_de_botella (roadmap_process_id);

ALTER TABLE public.cuellos_de_botella ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.cuellos_de_botella
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

CREATE TRIGGER update_cuellos_de_botella_updated_at
BEFORE UPDATE ON public.cuellos_de_botella
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
