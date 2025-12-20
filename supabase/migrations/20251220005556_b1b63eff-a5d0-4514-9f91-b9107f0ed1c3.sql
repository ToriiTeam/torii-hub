-- Create installments table for individual payment amounts per client
CREATE TABLE public.client_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, installment_number)
);

-- Enable RLS
ALTER TABLE public.client_installments ENABLE ROW LEVEL SECURITY;

-- Create policy for all users (matching existing pattern)
CREATE POLICY "Allow all for all users" 
ON public.client_installments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_client_installments_updated_at
BEFORE UPDATE ON public.client_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_client_installments_client_id ON public.client_installments(client_id);
CREATE INDEX idx_client_installments_due_date ON public.client_installments(due_date);