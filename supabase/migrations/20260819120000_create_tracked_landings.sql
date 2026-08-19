CREATE TABLE public.tracked_landings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id text NOT NULL UNIQUE,
  label text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  business_line text NOT NULL DEFAULT 'torii-ads',
  group_id uuid REFERENCES public.tracked_landings(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracked_landings_group_id ON public.tracked_landings (group_id);

ALTER TABLE public.tracked_landings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.tracked_landings
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

-- Backfill de lo que ya existe hoy hardcodeado en LANDING_OPTIONS/AnaliticasView,
-- para no romper nada al migrar. Adolfo y Raúl quedan vinculados a su fila real
-- en clients (encontrados por nombre); torii-principal y metodo-cierre no
-- pertenecen a un cliente puntual.
INSERT INTO public.tracked_landings (landing_id, label, client_id, business_line, group_id) VALUES
  ('torii-principal', 'Torii — Principal', NULL, 'torii-ads', NULL),
  ('adolfo-blasco', 'Adolfo Blasco', (SELECT id FROM public.clients WHERE name = 'Adolfo Blasco'), 'torii-ads', NULL),
  ('raul-galindo', 'Raúl Galindo', (SELECT id FROM public.clients WHERE name = 'Raul Galindo'), 'torii-ads', NULL),
  ('metodo-cierre', 'Máquina de Cierres', NULL, 'maquina-cierres', NULL);
