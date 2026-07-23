-- The 10 auto-link rows confirmed earlier (exact or near-exact source→
-- clients.name matches) — never actually applied, only the 9-new-clients
-- backfill was. Linking by exact income id, not by name, to avoid any
-- ambiguity.
UPDATE incomes SET client_id = 'c71488f4-0f94-4850-9a96-bc97fbaf5171' WHERE id = 'f4030bd3-6fd1-44ad-a0e7-4bd75fad8df5'; -- Adolfo Blasco 500
UPDATE incomes SET client_id = 'c71488f4-0f94-4850-9a96-bc97fbaf5171' WHERE id = '196d129f-88c1-4933-b197-cc32f2ed661c'; -- Adolfo Blasco 477
UPDATE incomes SET client_id = 'ea9cf0cb-c211-4177-8215-71755bd6bfcb' WHERE id = 'f437df1a-e1ac-4fc7-9144-93f813cd3d48'; -- Alejandro Ramirez 2250
UPDATE incomes SET client_id = '2522a3ce-fd50-4599-b90f-97da54d3b33b' WHERE id = '8800e30a-6e09-46a9-a5c6-c114d3960d00'; -- Carlos Diaz 2867
UPDATE incomes SET client_id = '523ee735-9d92-452b-9f41-51a182093449' WHERE id = 'ce7929a6-ada8-46f4-9c0d-15d38a3b76f6'; -- Fernanda Casares 700
UPDATE incomes SET client_id = '8cc5cc1a-9ef2-44ac-b652-bb8ca0af5f96' WHERE id = '2de295a2-218a-4d22-854b-d56c5167065f'; -- Giovanna Guzzo 3000
UPDATE incomes SET client_id = '5b49e188-2f9a-447a-a772-9bd8faba8f39' WHERE id = 'd76c9163-04ac-4d7a-b2bd-f6e64b7607b0'; -- Maite Hidalgo 340 (04-15)
UPDATE incomes SET client_id = '5b49e188-2f9a-447a-a772-9bd8faba8f39' WHERE id = '5556939c-6a92-4ef3-bcae-3a5a3f7296b8'; -- Maite Hidalgo 340 (04-16)
UPDATE incomes SET client_id = '5b49e188-2f9a-447a-a772-9bd8faba8f39' WHERE id = '46a58ce7-551c-40d6-ac83-4a5028fec9ae'; -- Maite Hidalgo 340 (05-12)
UPDATE incomes SET client_id = 'fcc225d1-555a-4d9c-abb9-b823d48b6516' WHERE id = '2f4acf11-dfa0-4561-ba25-0d651f6787c9'; -- Raúl Galindo 955
