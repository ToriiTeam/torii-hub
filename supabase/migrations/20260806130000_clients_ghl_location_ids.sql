-- Carga ghl_location_id para Raúl Galindo y Carlos Diaz. Adolfo Blasco
-- queda deliberadamente SIN ghl_location_id: su sub-cuenta de GHL está
-- compartida con la de Carlos Diaz, así que matchear por locationId
-- atribuiría sus agendas a Carlos sin forma de distinguirlas. Sigue
-- resolviendo por ghl_calendar_id (ya cargado), que sí es específico de
-- Adolfo dentro de esa sub-cuenta compartida.
UPDATE public.clients SET ghl_location_id = '060SqFZKPPnoxGwSqAPs' WHERE id = 'fcc225d1-555a-4d9c-abb9-b823d48b6516'; -- Raul Galindo
UPDATE public.clients SET ghl_location_id = 'htQLA2ilbpAfgf8SGwcW' WHERE id = '2522a3ce-fd50-4599-b90f-97da54d3b33b'; -- Carlos Diaz
