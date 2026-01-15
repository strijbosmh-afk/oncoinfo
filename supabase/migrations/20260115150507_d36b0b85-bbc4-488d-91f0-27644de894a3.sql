-- Add primary_endpoint_met column to trials table
ALTER TABLE public.trials 
ADD COLUMN primary_endpoint_met boolean DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.trials.primary_endpoint_met IS 'Indicates whether the trial met its primary endpoint. NULL = unknown, true = met, false = not met';