-- Repara un auth.users huérfano de un intento anterior de
-- create-portal-user: createUser() había funcionado, pero como la función
-- todavía no insertaba en profiles (ver fix en supabase/functions/
-- create-portal-user), clients.profile_id nunca se pudo setear —
-- clients_profile_id_fkey exige que la fila de profiles exista primero.
-- Verificado antes de aplicar: ningún otro cliente tenía ya este
-- profile_id (0 duplicados), y el login con la contraseña fija del Portal
-- se confirmó funcionando después de este fix.
INSERT INTO public.profiles (id, email, role)
VALUES ('e218d1bc-4245-4b6c-871b-b228abb5465b', 'victorothon@toriiteam.site', 'client');

UPDATE public.clients
SET profile_id = 'e218d1bc-4245-4b6c-871b-b228abb5465b'
WHERE id = '1065dd6a-4cd2-42dc-9495-26c618846b1a';
