-- Add assigned_to column to client_tasks table
ALTER TABLE public.client_tasks 
ADD COLUMN assigned_to uuid REFERENCES public.team_users(id) ON DELETE SET NULL;