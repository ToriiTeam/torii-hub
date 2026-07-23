-- Fixes a single pre-line-item-import expense row that had a corrupted
-- date ('0026-12-08', a 2-digit-year typo for 2025-12-08) and a null
-- cost_type. The bad year meant this row's date string sorted before
-- every real period/year filter (e.g. '0026-12-08' < '2000-01-01'
-- lexicographically), so it never showed up in Egresos/Resultado/
-- Métricas/Dashboard, while still silently being counted in
-- calcCajaActual()'s unfiltered historical sum. See diagnosis in
-- conversation — this is a monthly rollup entered before expenses were
-- itemized per-transaction, hence no itemized breakdown for Dec 2025's
-- software/BD/domain costs.
UPDATE expenses
SET
  date = '2025-12-08',
  category = 'Software',
  cost_type = 'CV',
  description = 'Resumen mensual agregado, previo a carga línea por línea (software+BD+dominio dic 2025)'
WHERE id = '6b817075-b3b9-451b-8b35-dc00c00508cf';
