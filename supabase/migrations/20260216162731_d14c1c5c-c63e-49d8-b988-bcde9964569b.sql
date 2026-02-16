
-- Recreate hospitals_public view with security_invoker to fix SECURITY DEFINER warning
DROP VIEW IF EXISTS public.hospitals_public;

CREATE VIEW public.hospitals_public
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  slug,
  logo_url,
  branding,
  is_active,
  display_order,
  created_at,
  updated_at,
  default_language
FROM public.hospitals
WHERE is_active = true;
