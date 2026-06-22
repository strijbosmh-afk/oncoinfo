-- Speed up the drug overview filters and ordering used by the app.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_drugs_active_display_order
  ON public.drugs (is_archived, display_order, generic_name);

CREATE INDEX IF NOT EXISTS idx_drugs_drug_class_active
  ON public.drugs (drug_class)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_drugs_administration_route_active
  ON public.drugs (administration_route)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_drugs_disease_areas_gin
  ON public.drugs USING gin (disease_areas);

CREATE INDEX IF NOT EXISTS idx_drugs_generic_name_trgm
  ON public.drugs USING gin (generic_name gin_trgm_ops)
  WHERE is_archived = false;
