-- Vínculo entre una cita agendada y el referido del que salió (cuando
-- aplique). Nullable: la mayoría de las citas no vienen de un referido.
ALTER TABLE public.client_closer_calls
  ADD COLUMN referido_id uuid REFERENCES public.referidos(id) ON DELETE SET NULL;

CREATE INDEX idx_client_closer_calls_referido_id ON public.client_closer_calls(referido_id);
