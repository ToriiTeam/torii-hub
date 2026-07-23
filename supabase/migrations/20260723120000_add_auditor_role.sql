-- New role for external auditors with read-only, scoped access (see the
-- follow-up migration for the actual RLS policies). Kept in its own
-- migration because Postgres won't let a new enum value be referenced by
-- name in the same transaction that adds it.
ALTER TYPE public.app_role ADD VALUE 'auditor';
