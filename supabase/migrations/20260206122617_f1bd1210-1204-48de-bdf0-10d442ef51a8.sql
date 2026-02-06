-- Create storage bucket for public assets like logos
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true);

-- Allow public read access
CREATE POLICY "Public assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'public-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload public assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'public-assets' AND auth.role() = 'authenticated');