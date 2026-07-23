-- 3 of the 5 clients with a @toriiteam.site placeholder email are active
-- and need their real email for GHL contact lookups (sync-ghl-onboarding
-- searches by clients.email) — replacing with the real addresses Benjamin
-- confirmed.
update clients set email = 'raul.galindo2020@gmail.com'
where id = 'fcc225d1-555a-4d9c-abb9-b823d48b6516'; -- Raul Galindo

update clients set email = 'adolfo.blasco.asesor@gmail.com'
where id = 'c71488f4-0f94-4850-9a96-bc97fbaf5171'; -- Adolfo Blasco

update clients set email = 'gguazo@goquegroup.com'
where id = '8cc5cc1a-9ef2-44ac-b652-bb8ca0af5f96'; -- Giovanna Guzzo
