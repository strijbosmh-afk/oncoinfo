-- Add unit_price column to drugs table for Belgian pricing
ALTER TABLE public.drugs 
ADD COLUMN unit_price DECIMAL(10,2) DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.drugs.unit_price IS 'Unit price of the drug in EUR';