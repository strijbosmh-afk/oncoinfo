
-- Add display_order column to drugs table for custom ordering
ALTER TABLE public.drugs 
ADD COLUMN display_order integer DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX idx_drugs_display_order ON public.drugs (display_order);

-- Initialize display_order based on current alphabetical order within each disease area
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY disease_areas, generic_name) as rn
  FROM public.drugs
)
UPDATE public.drugs d
SET display_order = o.rn
FROM ordered o
WHERE d.id = o.id;
