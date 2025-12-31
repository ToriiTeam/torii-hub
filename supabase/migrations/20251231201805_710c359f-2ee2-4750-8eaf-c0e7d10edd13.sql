-- Create storage bucket for receipts/comprobantes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for receipts bucket
CREATE POLICY "Anyone can view receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can delete receipts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'receipts');