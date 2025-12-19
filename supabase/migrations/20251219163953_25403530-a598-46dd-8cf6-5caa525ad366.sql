-- Add total_amount column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;