-- CSB v2 — replaces the 5 structured jsonb fields + 6 legacy free-text
-- fields (all confirmed empty/null on the only existing row, Raúl
-- Galindo — see the migration-planning conversation) with the richer
-- 7-block schema, plus AI-generation support (sintesis, brief_document,
-- revisado). csl_content/drive_csl_id are untouched — those belong to the
-- CSL, not the CSB.
ALTER TABLE client_csb
  ADD COLUMN cliente jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN identidad_estrategica jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN estado_actual jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN estado_deseado jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "constraints" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN riesgos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN inteligencia jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { mayor_apalancamiento, mayor_riesgo, "señal_exito_30_dias" } — the 3
  -- "Criterio de ejecución" fields from the Paso 2 brief, extracted by a
  -- 3rd short Claude call (more reliable than parsing the Markdown by hand).
  ADD COLUMN sintesis jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Full narrative Markdown from Paso 2, meant to be pasted into Word as-is
  -- — same role csl_content plays for the CSL.
  ADD COLUMN brief_document text,
  -- False right after AI generation — TabCSB.tsx shows a "pendiente de
  -- revisión" banner and Benjamin can edit every field before flipping
  -- this to true via "Marcar como revisado".
  ADD COLUMN revisado boolean NOT NULL DEFAULT false;

ALTER TABLE client_csb
  DROP COLUMN oferta,
  DROP COLUMN icp,
  DROP COLUMN mercado,
  DROP COLUMN precio,
  DROP COLUMN garantia,
  DROP COLUMN notas,
  DROP COLUMN contexto_operativo,
  DROP COLUMN objetivo_cliente,
  DROP COLUMN riesgos_operativos,
  DROP COLUMN compromisos_torii,
  DROP COLUMN expectativas_cliente;
