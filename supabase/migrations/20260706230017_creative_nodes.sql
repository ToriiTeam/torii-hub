CREATE TABLE public.creative_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.creative_nodes(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  angulo text,
  hipotesis text,
  tipo text DEFAULT 'video',
  estado text DEFAULT 'en_test',
  media_url text,
  notas text,
  position_x float DEFAULT 0,
  position_y float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX creative_nodes_client_id_idx ON public.creative_nodes(client_id);
CREATE INDEX creative_nodes_parent_id_idx ON public.creative_nodes(parent_id);

ALTER TABLE public.creative_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON public.creative_nodes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
