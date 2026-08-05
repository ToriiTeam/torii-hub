-- ═══════════════════════════════════════════════════════════════════════
-- La gestión del roster de Academia (team_members, formacion_access,
-- module_access, avatars) se muda al Hub — el admin del Portal ya la
-- puede escribir hoy vía is_portal_admin() (agregado en el commit que
-- sumó avatar_url/cover_image_url). El cliente en torii-portal deja de
-- tener UI para esto, así que sus policies bajan de FOR ALL a FOR SELECT:
-- sigue leyendo su roster y sus accesos (los necesita para "Estoy cargando
-- por" y para saber qué módulos ve desbloqueados), pero ya no escribe.
--
-- video_progress, reflection_tasks, exam_submissions NO se tocan: ahí el
-- cliente sigue siendo quien escribe (rinde examen, manda reflexión, marca
-- video visto) — eso sigue siendo consumo, no administración.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Clients can manage own team members" ON academy.team_members;
CREATE POLICY "Clients can view own team members" ON academy.team_members
  FOR SELECT USING (academy.is_own_client(client_id));

DROP POLICY IF EXISTS "Clients can manage own team formacion access" ON academy.formacion_access;
CREATE POLICY "Clients can view own team formacion access" ON academy.formacion_access
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM academy.team_members tm
    WHERE tm.id = formacion_access.team_member_id AND academy.is_own_client(tm.client_id)
  ));

DROP POLICY IF EXISTS "Clients can manage own team module access" ON academy.module_access;
CREATE POLICY "Clients can view own team module access" ON academy.module_access
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM academy.team_members tm
    WHERE tm.id = module_access.team_member_id AND academy.is_own_client(tm.client_id)
  ));

DROP POLICY IF EXISTS "Clients can manage own team avatars" ON storage.objects;
-- No SELECT replacement needed here: "Authenticated can read avatars" already
-- covers read for everyone, clients included.
