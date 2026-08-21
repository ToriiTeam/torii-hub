-- Habilita RLS en las 16 tablas que el checker de seguridad de Supabase
-- marcó como críticas (RLS deshabilitado, expuestas a anon/authenticated).
-- Mismo patrón usado en toda esta sesión (tracked_landings, vsl_entries, etc.).

-- === En uso activo (mayor prioridad) ===
ALTER TABLE public.client_crm_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.client_crm_calls FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.client_csb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.client_csb FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.client_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.client_hypotheses FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.angles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.angles FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.scripts FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

-- === Huérfanas o vacías (resto) ===
ALTER TABLE public.bottlenecks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.bottlenecks FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.experience_layer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.experience_layer FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.feedback_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.feedback_cliente FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.hitos_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.hitos_cliente FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.negocio_contexto_semanal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.negocio_contexto_semanal FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.negocio_objetivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.negocio_objetivos FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.negocio_roadmap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.negocio_roadmap FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.onboarding_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.onboarding_cliente FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.ads_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.ads_leads FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.alertas FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));

ALTER TABLE public.client_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff no-auditor no-client puede todo"
ON public.client_health FOR ALL
USING (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role))
WITH CHECK (NOT has_role(auth.uid(), 'auditor'::app_role) AND NOT has_role(auth.uid(), 'client'::app_role));
