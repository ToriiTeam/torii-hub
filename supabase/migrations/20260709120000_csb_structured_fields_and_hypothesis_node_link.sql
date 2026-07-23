-- Part 1: structured jsonb fields on client_csb, replacing free-text
-- capture of "quién es el cliente y dónde está" (contexto_operativo,
-- objetivo_cliente) plus new risk/commitment/expectation tracking that
-- didn't exist before at all.
ALTER TABLE client_csb
  ADD COLUMN contexto_operativo jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN objetivo_cliente jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN riesgos_operativos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN compromisos_torii jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN expectativas_cliente jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Part 2: drop the 4 legacy free-text fields. Verified beforehand (see
-- conversation) that client_csb has exactly one row (Raúl Galindo) and all
-- 4 columns are NULL on it — nothing to migrate, no data lost.
ALTER TABLE client_csb
  DROP COLUMN angulo_principal,
  DROP COLUMN hipotesis_activa,
  DROP COLUMN objecion_principal,
  DROP COLUMN propuesta_de_valor;

-- Part 3: reactivate hypothesis_history (currently unused by any frontend
-- code, 0 rows) by letting a hypothesis snapshot link to a specific
-- creative_nodes iteration, not just to an angle. Frontend to consume this
-- is not implemented yet.
ALTER TABLE hypothesis_history
  ADD COLUMN creative_node_id uuid REFERENCES creative_nodes(id);
