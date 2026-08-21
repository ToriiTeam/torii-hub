-- Chat en tiempo real por cliente dentro de Delivery OS. Mensajes de staff,
-- cliente (Portal, futuro) y sistema (automatización, ej. citas agendadas
-- por el webhook de GHL). Mismo patrón de RLS que referidos.sql: staff
-- no-auditor no-client ve/crea todo, client solo lo propio de su client_id.
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('staff', 'client', 'system')),
  sender_name text NOT NULL,
  sender_user_id uuid NULL,
  texto text NOT NULL,
  related_call_id uuid NULL REFERENCES public.client_closer_calls(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_client_id ON public.chat_messages (client_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- staff no-auditor no-client puede ver y crear (mismo patrón de siempre)
CREATE POLICY "staff no-auditor no-client puede ver y crear"
ON public.chat_messages FOR SELECT
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

CREATE POLICY "staff no-auditor no-client puede crear"
ON public.chat_messages FOR INSERT
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

-- client: ver y crear solo en su propio client_id (mismo patrón que referidos.sql)
CREATE POLICY "client puede ver sus propios mensajes"
ON public.chat_messages FOR SELECT
USING (has_role(auth.uid(), 'client'::app_role) AND client_id = (SELECT clients.id FROM clients WHERE clients.profile_id = auth.uid()));

CREATE POLICY "client puede crear sus propios mensajes"
ON public.chat_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'client'::app_role) AND client_id = (SELECT clients.id FROM clients WHERE clients.profile_id = auth.uid()) AND sender_type = 'client');

-- DELETE: nadie borra mensajes ajenos, ni siquiera staff. Solo el propio
-- autor (sender_user_id = auth.uid()). Mensajes de sistema
-- (sender_user_id NULL) no los borra nadie vía esta policy.
CREATE POLICY "cada quien borra solo sus propios mensajes"
ON public.chat_messages FOR DELETE
USING (sender_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
