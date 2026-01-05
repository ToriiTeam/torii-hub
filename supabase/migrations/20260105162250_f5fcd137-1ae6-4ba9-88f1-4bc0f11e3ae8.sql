-- Add setter_id to closer_calls to track which setter scheduled the call
ALTER TABLE public.closer_calls 
ADD COLUMN setter_id uuid REFERENCES public.setters(id) ON DELETE SET NULL;