
-- Create a public view without billing columns
CREATE VIEW public.hospitals_public
WITH (security_invoker = false) AS
SELECT 
  id, name, slug, logo_url, branding, is_active, 
  display_order, default_language, created_at, updated_at
FROM public.hospitals
WHERE is_active = true;

-- Grant access to the view for anon and authenticated roles
GRANT SELECT ON public.hospitals_public TO anon, authenticated;

-- Drop the overly broad public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active hospitals" ON public.hospitals;

-- Add a policy so authenticated users can still view their own hospital (full row including billing)
-- The existing "Users can view their own hospital" and "Platform admins can manage hospitals" policies already cover this.
