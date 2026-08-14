-- Mapeo real cliente↔cuenta de Meta, reemplaza el fuzzy-match por nombre
-- de AccountContext.tsx (matchClientToAccount). Mismo formato que ya usa
-- ads_campanas.ad_account_id (confirmado contra datos reales: sin el
-- prefijo "act_", solo el número).
ALTER TABLE public.clients ADD COLUMN meta_ad_account_id text;

UPDATE public.clients SET meta_ad_account_id = '1149189837277753' WHERE id = '8cc5cc1a-9ef2-44ac-b652-bb8ca0af5f96'; -- Giovanna Guzzo
UPDATE public.clients SET meta_ad_account_id = '2048346122438286' WHERE id = 'c71488f4-0f94-4850-9a96-bc97fbaf5171'; -- Adolfo Blasco
UPDATE public.clients SET meta_ad_account_id = '1171255983257630' WHERE id = '2522a3ce-fd50-4599-b90f-97da54d3b33b'; -- Carlos Diaz
UPDATE public.clients SET meta_ad_account_id = '1044494265209217' WHERE id = '1065dd6a-4cd2-42dc-9495-26c618846b1a'; -- Victor Othon
