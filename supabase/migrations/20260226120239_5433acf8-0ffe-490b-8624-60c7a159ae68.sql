-- Add default_language to profiles, defaulting to null (which means "inherit from hospital")
ALTER TABLE public.profiles ADD COLUMN default_language text DEFAULT NULL;

-- Backfill existing profiles with their hospital's default_language
UPDATE public.profiles p
SET default_language = h.default_language
FROM public.hospitals h
WHERE p.hospital_id = h.id
AND p.default_language IS NULL;