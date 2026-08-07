-- Reemplaza el CALENDAR_CLIENT_MAP hardcodeado de ghl-appointment-webhook
-- por un lookup real a clients — agregar un cliente nuevo a la automatización
-- pasa a ser "cargar su ghl_location_id/ghl_calendar_id", sin deploy de código.
-- locationId es la clave primaria de matcheo (1 sub-cuenta de GHL = 1
-- cliente, estable aunque el cliente cree más calendarios a futuro);
-- calendarId queda como fallback porque es el dato que ya se conocía.
ALTER TABLE public.clients ADD COLUMN ghl_location_id text UNIQUE;
ALTER TABLE public.clients ADD COLUMN ghl_calendar_id text UNIQUE;

-- Valores ya conocidos del CALENDAR_CLIENT_MAP hardcodeado (solo calendarId
-- — nunca se capturó el locationId de estos 2 clientes). El calendarId de
-- Torii (nWH3iMURelrwQtakWcYe) no entra acá porque Torii no es una fila de
-- clients — vive como secret GHL_TORII_CALENDAR_ID de la edge function,
-- junto con GHL_LOCATION_ID (ya existente, usado por ghl-mc-clients) como
-- el locationId de Torii.
UPDATE public.clients SET ghl_calendar_id = 'BQHvGXV2U538u0eRbcvb' WHERE id = 'c71488f4-0f94-4850-9a96-bc97fbaf5171'; -- Adolfo Blasco
UPDATE public.clients SET ghl_calendar_id = '4lTNJ8XbAf0lrGQs7A3l' WHERE id = 'fcc225d1-555a-4d9c-abb9-b823d48b6516'; -- Raul Galindo
