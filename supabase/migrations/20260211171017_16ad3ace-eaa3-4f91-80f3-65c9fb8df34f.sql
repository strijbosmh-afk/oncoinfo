
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Set initial display_order based on name alphabetically
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY is_active DESC, name ASC) - 1 AS rn
  FROM public.hospitals
)
UPDATE public.hospitals SET display_order = ordered.rn FROM ordered WHERE hospitals.id = ordered.id;
