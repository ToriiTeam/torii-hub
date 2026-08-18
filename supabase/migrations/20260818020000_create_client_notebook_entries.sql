CREATE TABLE public.client_notebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  contenido jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notebook_entries_client_id ON public.client_notebook_entries (client_id);

ALTER TABLE public.client_notebook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo"
ON public.client_notebook_entries
FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

CREATE TRIGGER update_client_notebook_entries_updated_at
BEFORE UPDATE ON public.client_notebook_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
