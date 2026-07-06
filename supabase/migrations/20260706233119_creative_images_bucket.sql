INSERT INTO storage.buckets (id, name, public)
VALUES ('creative-images', 'creative-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view creative images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'creative-images');

CREATE POLICY "Authenticated users can upload creative images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creative-images');

CREATE POLICY "Authenticated users can update creative images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'creative-images');

CREATE POLICY "Authenticated users can delete creative images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'creative-images');
