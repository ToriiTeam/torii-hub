-- One row per answered question, not one column per question — the same
-- mechanism serves GHL's onboarding form today and whatever else answers
-- get loaded from later (Google Forms, manual entry) without a schema
-- change if the form's questions change.
CREATE TABLE client_onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  fuente TEXT NOT NULL CHECK (fuente IN ('GHL', 'Google Forms', 'Manual')),
  campo TEXT NOT NULL,
  valor TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Re-syncing the same question from the same source updates the existing
  -- row (via upsert onConflict) instead of duplicating it.
  UNIQUE (client_id, fuente, campo)
);
ALTER TABLE client_onboarding_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for all users" ON client_onboarding_responses FOR ALL USING (true) WITH CHECK (true);
