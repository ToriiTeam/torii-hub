-- How Torii itself acquired this client (Torii's own client-acquisition
-- channel) — distinct from the pre-existing `clients.canal` column, which
-- describes the client's OWN marketing channel for their business (e.g.
-- Adolfo Blasco / Raúl Galindo run Meta Ads for their own leads; that's
-- what `canal` captures). No default and no backfill — existing clients
-- stay NULL until Benjamin fills this in by hand with real data.
ALTER TABLE clients
  ADD COLUMN canal_captacion TEXT
    CHECK (canal_captacion IN ('Meta Ads','Referido','LinkedIn orgánico','Instagram orgánico','YouTube','Outbound/Setters','Otro'));
