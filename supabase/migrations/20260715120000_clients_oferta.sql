-- "Nuevo Torii" client-scoping now uses a real productized-offer field
-- instead of a hardcoded UUID set or date cutoff. oferta describes which
-- service Torii delivers to the client, independent of canal_captacion
-- (how the client was acquired) — e.g. Adolfo Blasco and Raúl Galindo were
-- both closed via LinkedIn outbound calls but bought the Meta Ads Leadgen
-- service.
alter table clients
  add column oferta text check (oferta in ('LinkedIn Outbound', 'Meta Ads Leadgen'));

update clients set oferta = 'Meta Ads Leadgen'
where id in (
  'c71488f4-0f94-4850-9a96-bc97fbaf5171', -- Adolfo Blasco
  'fcc225d1-555a-4d9c-abb9-b823d48b6516', -- Raul Galindo
  '2522a3ce-fd50-4599-b90f-97da54d3b33b'  -- Carlos Diaz
);

update clients set oferta = 'LinkedIn Outbound' where oferta is null;

-- Data-quality fix found while auditing this cohort: these two
-- client_closer_calls.lead_name values don't match the corresponding
-- clients.name spelling, which would otherwise keep confusing any future
-- name-based cross-referencing (client_id is null on owner_type='torii'
-- rows, so there's no FK to catch this).
update client_closer_calls set lead_name = 'Zoii Briceño'
where owner_type = 'torii' and lead_name = 'Zoi Briceño';

update client_closer_calls set lead_name = 'Giovanna Guzzo'
where owner_type = 'torii' and lead_name = 'Giovanna Guazo';
