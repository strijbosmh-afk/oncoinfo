
-- Add default language to hospitals
ALTER TABLE public.hospitals
  ADD COLUMN default_language text NOT NULL DEFAULT 'nl';

COMMENT ON COLUMN public.hospitals.default_language IS 'Default UI language: nl, fr, de, en';
