CREATE TABLE public.hipotesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  texto text NOT NULL,
  metrica text,
  responsable text,
  estado text NOT NULL DEFAULT 'testeando' CHECK (estado IN ('testeando', 'validado', 'matado', 'a_iterar')),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  resultado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hipotesis_client_id ON public.hipotesis (client_id);

ALTER TABLE public.hipotesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.hipotesis
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

CREATE TRIGGER update_hipotesis_updated_at
BEFORE UPDATE ON public.hipotesis
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
