-- Add price_unit column to drugs table
ALTER TABLE public.drugs 
ADD COLUMN price_unit VARCHAR(50) DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.drugs.price_unit IS 'Unit for the price: tablet, flacon, dosis, infuus, behandeling, etc.';