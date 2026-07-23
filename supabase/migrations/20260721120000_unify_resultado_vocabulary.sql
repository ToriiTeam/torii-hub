-- Unifies the 3 separate "win/lose/testing" vocabularies diagnosed over
-- several sessions: hypothesis_history.resultado (gano/perdio/inconcluso),
-- angles.resultado (ganador/perdedor/en_test/sin_datos), and
-- creative_nodes.estado (en_test/ganador/perdedor/pausado, no CHECK
-- constraint existed for this one at all before this migration).
--
-- Chosen vocabulary: en_test, ganador, perdedor, inconcluso, pausado.
-- 'pausado' stays a real 5th state (not folded into 'en_test') because
-- creative_nodes had 5 real rows using it as a distinct operational state
-- (paused, not actively testing, not concluded) at the time of this
-- migration. 'sin_datos' (angles' old 4th value) is retired instead — 0
-- real rows ever used it, and it only duplicated what a nullable resultado
-- already means.
--
-- Real data at migration time: hypothesis_history had 1 row ('gano'),
-- angles.resultado was 100% null (4/4 rows), creative_nodes.estado had 41
-- 'en_test' + 5 'pausado' rows — both already match the unified vocabulary
-- as-is, no remap needed for that table.

-- hypothesis_history: drop the old constraint FIRST (it doesn't allow
-- 'ganador'/'perdedor' yet), remap the 1 real row, then add the new one.
ALTER TABLE hypothesis_history DROP CONSTRAINT hypothesis_history_resultado_check;
UPDATE hypothesis_history SET resultado = 'ganador' WHERE resultado = 'gano';
UPDATE hypothesis_history SET resultado = 'perdedor' WHERE resultado = 'perdio';
ALTER TABLE hypothesis_history ADD CONSTRAINT hypothesis_history_resultado_check
  CHECK (resultado = ANY (ARRAY['en_test', 'ganador', 'perdedor', 'inconcluso', 'pausado']));

-- angles.resultado: nothing to remap (100% null), just widen the constraint
-- and drop 'sin_datos' from the allowed set.
ALTER TABLE angles DROP CONSTRAINT angles_resultado_check;
ALTER TABLE angles ADD CONSTRAINT angles_resultado_check
  CHECK (resultado = ANY (ARRAY['en_test', 'ganador', 'perdedor', 'inconcluso', 'pausado']));

-- creative_nodes.estado: never had a CHECK constraint at the DB level —
-- adding one now for the first time, with the same unified vocabulary.
ALTER TABLE creative_nodes ADD CONSTRAINT creative_nodes_estado_check
  CHECK (estado = ANY (ARRAY['en_test', 'ganador', 'perdedor', 'inconcluso', 'pausado']));
