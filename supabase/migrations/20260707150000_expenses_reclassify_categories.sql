-- Aligns historical expenses.category values with the 6-bucket taxonomy
-- used by the new Resultado/Métricas tabs (Equipo, Adquisición, Software,
-- Publicidad, Mentoría, Otros). Mapping confirmed by hand against real row
-- data — see conversation history.

-- 'Anuncios' (1 row, $103) — literally ad spend, same bucket as Publicidad.
UPDATE public.expenses SET category = 'Publicidad' WHERE category = 'Anuncios';

-- 'Comisiones' (3 rows, $90) — setter/closer commissions are an acquisition
-- cost, not overhead.
UPDATE public.expenses SET category = 'Adquisición' WHERE category = 'Comisiones';

-- 'Dinero prestado' (1 row, $300, "Devolución a Juan") and 'Devoluciones'
-- (1 row, $143, "Devolución a Santi DLC") both turned out to be completed
-- repayments of cash someone personally fronted for a company payment —
-- real, already-settled expenses, not outstanding accounts payable. Left
-- in expenses, bucketed into Otros rather than moved to debts.
UPDATE public.expenses SET category = 'Otros' WHERE category IN ('Dinero prestado', 'Devoluciones');

-- 'Licencias' (8 rows, $450.30) — merged into Software.
UPDATE public.expenses SET category = 'Software' WHERE category = 'Licencias';

-- NULL category (15 rows, $3,050.44) — no categorization info existed, so
-- there's nothing to recover; bucketed as Otros going forward.
UPDATE public.expenses SET category = 'Otros' WHERE category IS NULL;

-- 'Seiiki' (6 rows, $2,582) is left untouched in the database — it looks
-- like a vendor/project name used as a category by mistake, not something
-- that maps cleanly to one of the 6 buckets, and no mapping was confirmed
-- for it. It still needs to be treated as Otros for Resultado/Métricas
-- display purposes (any category outside the canonical 6 buckets falls
-- back to Otros at query time), but the raw value stays 'Seiiki' in the
-- table for reference/traceability.
