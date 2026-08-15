-- Bucket para subida real de archivos (PDF/video) en TabVideosDocs.tsx —
-- "informes sueltos" que no vienen del wizard de Reportes (ese usa el
-- bucket `reports` aparte). Público, mismo patrón que avatars/module-
-- materials/etc. Límite explícito de 100MB en vez de heredar el default
-- global del proyecto, porque un video pesa mucho más que un PDF/avatar.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-informes-sueltos', 'client-informes-sueltos', true, 104857600);

CREATE POLICY "Cualquiera puede ver informes sueltos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-informes-sueltos');

CREATE POLICY "Staff no-auditor no-client puede subir informes sueltos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-informes-sueltos'
    AND (NOT has_role(auth.uid(), 'auditor'::app_role))
    AND (NOT has_role(auth.uid(), 'client'::app_role))
  );

CREATE POLICY "Staff no-auditor no-client puede actualizar informes sueltos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-informes-sueltos'
    AND (NOT has_role(auth.uid(), 'auditor'::app_role))
    AND (NOT has_role(auth.uid(), 'client'::app_role))
  );

CREATE POLICY "Staff no-auditor no-client puede borrar informes sueltos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-informes-sueltos'
    AND (NOT has_role(auth.uid(), 'auditor'::app_role))
    AND (NOT has_role(auth.uid(), 'client'::app_role))
  );
