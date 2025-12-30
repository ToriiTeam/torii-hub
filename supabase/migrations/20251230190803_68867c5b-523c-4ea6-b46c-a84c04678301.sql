-- Create setter_payments table for tracking setter payments
CREATE TABLE public.setter_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id uuid REFERENCES public.setters(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date,
  period_end date,
  meetings_count integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setter_payments ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all for all users"
ON public.setter_payments
FOR ALL
USING (true)
WITH CHECK (true);