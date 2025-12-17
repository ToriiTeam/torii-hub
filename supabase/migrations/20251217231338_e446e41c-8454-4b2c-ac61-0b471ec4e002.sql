-- Drop existing policies and recreate to allow both anon and authenticated users

-- team_users
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.team_users;
CREATE POLICY "Allow all for all users" ON public.team_users
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- tasks
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.tasks;
CREATE POLICY "Allow all for all users" ON public.tasks
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- task_assignees
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.task_assignees;
CREATE POLICY "Allow all for all users" ON public.task_assignees
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- team_availability
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.team_availability;
CREATE POLICY "Allow all for all users" ON public.team_availability
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- clients
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.clients;
CREATE POLICY "Allow all for all users" ON public.clients
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- client_products
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.client_products;
CREATE POLICY "Allow all for all users" ON public.client_products
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- client_tasks
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.client_tasks;
CREATE POLICY "Allow all for all users" ON public.client_tasks
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- setters
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.setters;
CREATE POLICY "Allow all for all users" ON public.setters
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- setter_meetings
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.setter_meetings;
CREATE POLICY "Allow all for all users" ON public.setter_meetings
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- closers
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closers;
CREATE POLICY "Allow all for all users" ON public.closers
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- closer_calls
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.closer_calls;
CREATE POLICY "Allow all for all users" ON public.closer_calls
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- call_recordings
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.call_recordings;
CREATE POLICY "Allow all for all users" ON public.call_recordings
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- documents
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.documents;
CREATE POLICY "Allow all for all users" ON public.documents
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- incomes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.incomes;
CREATE POLICY "Allow all for all users" ON public.incomes
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- fixed_costs
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.fixed_costs;
CREATE POLICY "Allow all for all users" ON public.fixed_costs
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- variable_costs
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.variable_costs;
CREATE POLICY "Allow all for all users" ON public.variable_costs
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- monthly_accounting
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.monthly_accounting;
CREATE POLICY "Allow all for all users" ON public.monthly_accounting
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- announcements
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.announcements;
CREATE POLICY "Allow all for all users" ON public.announcements
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- time_audit_tasks
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.time_audit_tasks;
CREATE POLICY "Allow all for all users" ON public.time_audit_tasks
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- user_performance
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.user_performance;
CREATE POLICY "Allow all for all users" ON public.user_performance
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);