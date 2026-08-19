CREATE TABLE public.creative_iteration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  texto text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  reemplaza_a_id uuid REFERENCES public.creative_iteration_log(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creative_iteration_log_client_id ON public.creative_iteration_log (client_id);

ALTER TABLE public.creative_iteration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.creative_iteration_log
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));
