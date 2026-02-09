-- Fix 1: Revoke anonymous access to get_email_by_username to prevent email enumeration
-- The login flow now uses the login-with-username edge function instead
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM public;

-- Fix 2: Restrict public-assets storage bucket uploads to admins only

-- Drop overly permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;

-- Drop any existing update/delete policies for this bucket
DROP POLICY IF EXISTS "Authenticated users can update public assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete public assets" ON storage.objects;

-- Create admin-only upload policy
CREATE POLICY "Admins can upload public assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'public-assets' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Create admin-only update policy
CREATE POLICY "Admins can update public assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'public-assets' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Create admin-only delete policy
CREATE POLICY "Admins can delete public assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'public-assets' AND 
  public.has_role(auth.uid(), 'admin')
);