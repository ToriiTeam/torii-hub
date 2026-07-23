-- Scopes the 'auditor' role (see previous migration) to read-only access on
-- exactly 2 slices of data: vsl_events for landing_id='torii-principal', and
-- ads_campanas/ads_metricas_diarias for the LM Social Constructions ad
-- account (ad_account_id='1151443753506231' — confirmed against real synced
-- data; this is Torii's own house account, the only client_id-null account
-- that has ever synced into ads_campanas).
--
-- IMPORTANT: a permissive "USING (true)" policy on a table grants access to
-- EVERY role it applies to, auditor included, regardless of any other
-- policy — permissive policies are OR'd together. So the existing blanket
-- policies must be narrowed to exclude auditor explicitly; a purely
-- additive policy for auditor would have zero effect on top of them.
-- Every other role's access is unchanged (same USING(true) effectively,
-- just spelled as "not auditor").

-- ─── vsl_events ─────────────────────────────────────────────────────────────
-- RLS was already enabled here. Replacing the one SELECT policy that grants
-- blanket read access; the anon insert policy (tracking pixel) is untouched.
DROP POLICY "authenticated puede leer" ON public.vsl_events;

CREATE POLICY "authenticated no-auditor puede leer todo"
ON public.vsl_events FOR SELECT TO authenticated
USING (NOT public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "auditor puede leer torii-principal"
ON public.vsl_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'auditor') AND landing_id = 'torii-principal');

-- ─── ads_campanas ───────────────────────────────────────────────────────────
-- RLS was NOT enabled on this table at all (relrowsecurity = false),
-- confirmed live against the project. Enabling it is a prerequisite: with
-- RLS off, every policy below would be a no-op and the table stays fully
-- open, including to the anon key. The "no-auditor acceso total" policy
-- reproduces today's de-facto behavior (any authenticated user, full
-- access) for every non-auditor role.
ALTER TABLE public.ads_campanas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated no-auditor acceso total"
ON public.ads_campanas FOR ALL TO authenticated
USING (NOT public.has_role(auth.uid(), 'auditor'))
WITH CHECK (NOT public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "auditor puede leer LM Social Constructions"
ON public.ads_campanas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'auditor') AND ad_account_id = '1151443753506231');

-- ─── ads_metricas_diarias ───────────────────────────────────────────────────
-- Same situation as ads_campanas: RLS was disabled entirely. Scoped via the
-- campana_id -> ads_campanas.ad_account_id join since this table has no
-- account identifier of its own.
ALTER TABLE public.ads_metricas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated no-auditor acceso total"
ON public.ads_metricas_diarias FOR ALL TO authenticated
USING (NOT public.has_role(auth.uid(), 'auditor'))
WITH CHECK (NOT public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "auditor puede leer metricas de LM Social Constructions"
ON public.ads_metricas_diarias FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'auditor')
  AND EXISTS (
    SELECT 1 FROM public.ads_campanas c
    WHERE c.id = ads_metricas_diarias.campana_id AND c.ad_account_id = '1151443753506231'
  )
);
