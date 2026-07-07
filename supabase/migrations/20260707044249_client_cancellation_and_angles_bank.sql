-- Cancelación de clientes (reemplaza el DELETE, que fallaba con 409 por FKs)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text,
  ADD COLUMN IF NOT EXISTS fecha_cancelacion date;

-- Banco de Ángulos: nuevos campos en angles (no toca pipeline_stage ni
-- resultado, ya usados por TabCreativos.tsx con otro vocabulario)
ALTER TABLE public.angles
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS origen text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS creative_node_id uuid REFERENCES public.creative_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS angles_creative_node_id_idx ON public.angles(creative_node_id);
