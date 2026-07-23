-- Backfill: 9 clients whose payments were recorded in `incomes` (source as
-- free text) but who never got a row in `clients`, discovered while
-- retroactively linking incomes.client_id for ROAS. status='finished' —
-- historical payments, no recent activity, not active today. Minimal data:
-- only name + approximate start_date (payment date); country/email/phone
-- etc. left null for Benjamin to fill in later.
WITH new_clients AS (
  INSERT INTO clients (name, start_date, status)
  VALUES
    ('Anzoni Licona', '2026-05-11', 'finished'),
    ('Juan Calleja', '2026-04-25', 'finished'),
    ('Lorena Grundy', '2026-01-16', 'finished'),
    ('Marino Lopez', '2026-01-15', 'finished'),
    ('Max Rosello', '2026-04-14', 'finished'),
    ('Raquel', '2026-01-05', 'finished'),
    ('Salvador Luna', '2026-01-15', 'finished'),
    ('Tere Gamon', '2026-01-02', 'finished'),
    ('Zoii Briceño', '2026-04-15', 'finished')
  RETURNING id, name
)
-- Link each of the 10 manual-review incomes rows to its new client_id, by
-- the exact row id (not by name matching) to avoid any ambiguity.
UPDATE incomes
SET client_id = new_clients.id
FROM new_clients
WHERE incomes.id = CASE new_clients.name
  WHEN 'Anzoni Licona' THEN 'd17f83c8-c117-4d4a-97da-524f584f9118'
  WHEN 'Juan Calleja' THEN '1379a2c8-c439-4e92-ac69-42e4aa214311'
  WHEN 'Lorena Grundy' THEN '7ff0f302-3fc0-4b2e-ac9c-30edd227ff67'
  WHEN 'Marino Lopez' THEN '937f7970-7386-4ec8-9d9d-171f4faf61e2'
  WHEN 'Max Rosello' THEN '1c305e46-9a9a-4008-8f9e-a00cee6d45fe'
  WHEN 'Raquel' THEN '66e24e53-c625-455f-a636-0aabc20daeca'
  WHEN 'Salvador Luna' THEN '2e2b830a-0a1a-4934-a12f-6f0564554077'
  WHEN 'Tere Gamon' THEN 'eb06f7ff-0bbe-4d9c-ae94-420999479ded'
  ELSE NULL
END::uuid
  AND new_clients.name NOT IN ('Zoii Briceño');

-- Zoii Briceño has 2 income rows to link, handled separately since the
-- CASE/name approach above only maps one row per name.
UPDATE incomes SET client_id = (SELECT id FROM clients WHERE name = 'Zoii Briceño' AND status = 'finished')
WHERE id IN ('977903d5-157a-4359-af8d-45e5482ec4ce', 'd8bf7849-65dd-474c-b59b-423ae27992ee');
