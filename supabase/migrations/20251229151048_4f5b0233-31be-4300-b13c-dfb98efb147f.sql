-- Create table to store task time logs
CREATE TABLE public.task_time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.team_users(id) ON DELETE SET NULL,
  duration_seconds integer NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for all authenticated users
CREATE POLICY "Allow all for authenticated users" 
ON public.task_time_logs 
FOR ALL 
USING (true)
WITH CHECK (true);