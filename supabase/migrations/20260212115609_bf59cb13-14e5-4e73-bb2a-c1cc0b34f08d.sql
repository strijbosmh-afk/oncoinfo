
DROP VIEW IF EXISTS public.hospitals_public;

CREATE VIEW public.hospitals_public AS
  SELECT id, name, slug, logo_url, branding, is_active, display_order, created_at, updated_at, default_language
  FROM public.hospitals
  WHERE is_active = true;

GRANT SELECT ON public.hospitals_public TO anon, authenticated;
