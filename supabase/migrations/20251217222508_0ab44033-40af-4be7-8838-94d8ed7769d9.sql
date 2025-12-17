-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('call-recordings', 'call-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload recordings
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'call-recordings');

-- Allow authenticated users to view recordings
CREATE POLICY "Authenticated users can view recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'call-recordings');

-- Allow authenticated users to delete their recordings
CREATE POLICY "Authenticated users can delete recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'call-recordings');