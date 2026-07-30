-- Phase 1 of porting the Portal admin panel into the Hub: unify the role
-- system by adding 'client' to app_role. Schema-only — no data migration,
-- no RLS/gating changes yet (that comes once real Portal screens are
-- ported). Kept in its own migration because Postgres won't let a new enum
-- value be referenced by name in the same transaction that adds it.
ALTER TYPE public.app_role ADD VALUE 'client';
