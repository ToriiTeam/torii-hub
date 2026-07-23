-- Sync-time order (the sequence GHL returns/processes custom fields in
-- during sync-ghl-onboarding) — not the real questionnaire sequence (GHL
-- doesn't expose that reliably: position ties heavily, dateAdded reflects
-- bulk-import batches, not form layout). Consistent per client across
-- re-syncs, which is strictly better than the prior created_at ordering
-- (arbitrary insertion order). Nullable so manually-loaded rows (no sync
-- order to speak of) and a future per-question manual order mapping can
-- both just set/overwrite this same column — no schema change needed
-- when that mapping is built.
ALTER TABLE client_onboarding_responses ADD COLUMN orden INTEGER;
