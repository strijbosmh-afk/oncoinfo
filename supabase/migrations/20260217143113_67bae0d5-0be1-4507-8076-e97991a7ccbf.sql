-- Add is_archived column to drugs table
ALTER TABLE public.drugs ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX idx_drugs_is_archived ON public.drugs (is_archived);
