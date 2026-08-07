-- Sistema de Referidos con IA: nueva tabla, aislada de client_closer_calls.
-- client_id identifica al asesor/cliente dueño del referido (mismo campo/
-- tabla que client_closer_calls.client_id → clients(id)), pero acá es
-- NOT NULL: a diferencia de client_closer_calls no existe un caso
-- "torii-owned" con client_id NULL — todo referido pertenece a un asesor.
-- RLS replica el mismo criterio de client_closer_calls (staff/admin
-- acceso total, client scoped a su propio client_id); auditor queda
-- sin acceso — su policy en client_closer_calls es específica de las
-- filas owner_type='torii', que no existen acá.
CREATE TABLE public.referidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  origen_call_id uuid REFERENCES public.client_closer_calls(id) ON DELETE SET NULL,

  presentado_por text,
  referido_nombre text NOT NULL,
  referido_telefono text,
  perfil_referido text,
  warm_intro boolean NOT NULL DEFAULT false,

  incentivo text CHECK (incentivo IS NULL OR incentivo IN ('relacional', 'servicio', 'monetario', 'ninguno')),
  estado text NOT NULL DEFAULT 'pendiente_datos' CHECK (estado IN (
    'pendiente_datos', 'pendiente_contacto', 'contactado', 'en_proceso', 'cerrado', 'no_califico'
  )),

  fecha_pedido date NOT NULL,
  fecha_contacto timestamptz,
  fecha_cierre timestamptz,

  ghl_contact_id text,
  notas text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referidos IS
  'Sistema de Referidos con IA: referidos que un cliente-final de un asesor de Torii presenta. estado arranca en pendiente_datos porque la llamada típicamente no trae el teléfono del referido; pasa a pendiente_contacto cuando referido_telefono se completa. ghl_contact_id queda sin usar hasta el Paso 5 (sync con GHL).';

CREATE INDEX idx_referidos_client_id ON public.referidos(client_id);
CREATE INDEX idx_referidos_estado ON public.referidos(estado);

ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff no-auditor no-client puede todo" ON public.referidos
  FOR ALL
  USING ((NOT has_role(auth.uid(), 'auditor'::app_role)) AND (NOT has_role(auth.uid(), 'client'::app_role)))
  WITH CHECK ((NOT has_role(auth.uid(), 'auditor'::app_role)) AND (NOT has_role(auth.uid(), 'client'::app_role)));

CREATE POLICY "client puede ver y gestionar sus propios referidos" ON public.referidos
  FOR ALL
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND client_id = (SELECT clients.id FROM clients WHERE clients.profile_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'client'::app_role)
    AND client_id = (SELECT clients.id FROM clients WHERE clients.profile_id = auth.uid())
  );
