-- Preserves the pre-normalization frequency info that the previous
-- migration's `UPDATE incomes SET type = 'Otro ingreso' WHERE type IN
-- ('unico', 'recurrente')` overwrote without recording. No backfill here —
-- see the migration commit message / conversation for why: no audit trail,
-- no updated_at trigger on incomes, and PITR is disabled on this project
-- (confirmed via `supabase backups list`), so the original 'unico' vs
-- 'recurrente' value per row is unrecoverable from the database alone.
-- Left NULL for every row; only a human cross-checking against the
-- original xlsx or memory can fill this in correctly.
ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS legacy_frequency text;
