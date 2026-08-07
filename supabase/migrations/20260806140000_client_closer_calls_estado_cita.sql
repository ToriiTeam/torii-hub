-- estado_cita: sin CHECK a propósito — todavía no vimos payloads reales del
-- Workflow "Appointment Status" de GHL para confirmar el set exacto de
-- valores en esta cuenta puntual. Se agrega el constraint después de
-- confirmar 2-3 casos reales.
-- cancelada: derivado de estado_cita='cancelled', lo sincroniza el propio
-- webhook en el mismo upsert — nunca se escribe a mano por separado.
ALTER TABLE public.client_closer_calls
  ADD COLUMN estado_cita text,
  ADD COLUMN cancelada boolean NOT NULL DEFAULT false;
