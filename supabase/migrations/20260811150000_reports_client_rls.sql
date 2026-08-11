-- reports estaba completamente abierta: una sola policy "Allow all for all
-- users" FOR ALL a {anon, authenticated} sin ningún scoping por client_id
-- (hallazgo de la auditoría previa a construir la sección "Reportes" del
-- Portal). Reemplazada por el mismo patrón que ya usa `referidos`: staff
-- con acceso total, client con SOLO LECTURA de sus propios reportes ya
-- publicados (enviado=true) — nunca ve borradores ni puede escribir nada.
DROP POLICY "Allow all for all users" ON public.reports;

CREATE POLICY "staff no-auditor no-client puede todo" ON public.reports
  FOR ALL
  USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

CREATE POLICY "client puede ver sus propios reportes enviados" ON public.reports
  FOR SELECT
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND enviado = true
    AND client_id = (SELECT clients.id FROM public.clients WHERE clients.profile_id = auth.uid())
  );
