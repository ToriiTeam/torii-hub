-- Closes the gap found while wiring the Executive Dashboard's VSL Funnel
-- tab into the auditor role: fetchToriiData() (which the VSL Funnel piggy-
-- backs on) touches client_closer_calls, clients, incomes, expenses,
-- client_installments and delivery_phases — none of which had an
-- auditor-aware policy, so the blanket "allow all authenticated" policies
-- on each gave the auditor full read/write access to Torii's entire
-- closing/financial data, not just the VSL/LM Social Constructions slice
-- the role is supposed to be scoped to.

-- ─── client_closer_calls ────────────────────────────────────────────────────
-- VSL Funnel needs this one (Agendas/Llamadas efectivas/Cierres/No Cierres) —
-- scoped to owner_type='torii' (the narrowest column available; there's no
-- landing/account link on this table).
DROP POLICY "authenticated puede todo" ON public.client_closer_calls;

CREATE POLICY "authenticated no-auditor puede todo"
ON public.client_closer_calls FOR ALL TO authenticated
USING (NOT public.has_role(auth.uid(), 'auditor'))
WITH CHECK (NOT public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "auditor puede leer closing de torii"
ON public.client_closer_calls FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'auditor') AND owner_type = 'torii');

-- ─── clients, incomes, expenses, client_installments, delivery_phases ──────
-- None of these are needed by the VSL Funnel — full lockdown for auditor,
-- no scoped-allow policy added. Every other role's access is unchanged
-- (auth.uid() is NULL for anon, so has_role(NULL, 'auditor') is false and
-- the exclusion is a no-op for the anon-inclusive policies below).

DROP POLICY "Allow all for all users" ON public.clients;
CREATE POLICY "Allow all except auditor"
ON public.clients FOR ALL
USING (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')))
WITH CHECK (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')));

DROP POLICY "Allow all for all users" ON public.incomes;
CREATE POLICY "Allow all except auditor"
ON public.incomes FOR ALL
USING (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')))
WITH CHECK (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')));

DROP POLICY "Allow all for all users" ON public.expenses;
CREATE POLICY "Allow all except auditor"
ON public.expenses FOR ALL
USING (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')))
WITH CHECK (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')));

DROP POLICY "Allow all for all users" ON public.client_installments;
CREATE POLICY "Allow all except auditor"
ON public.client_installments FOR ALL
USING (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')))
WITH CHECK (NOT (auth.role() = 'authenticated' AND public.has_role(auth.uid(), 'auditor')));

DROP POLICY "Authenticated full access" ON public.delivery_phases;
CREATE POLICY "Authenticated full access except auditor"
ON public.delivery_phases FOR ALL TO authenticated
USING (NOT public.has_role(auth.uid(), 'auditor'))
WITH CHECK (NOT public.has_role(auth.uid(), 'auditor'));
