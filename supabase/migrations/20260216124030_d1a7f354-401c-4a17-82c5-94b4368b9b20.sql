
-- Add dedicated nurse field to profiles (only meaningful for physicians)
ALTER TABLE public.profiles
ADD COLUMN dedicated_nurse_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_profiles_dedicated_nurse ON public.profiles(dedicated_nurse_id) WHERE dedicated_nurse_id IS NOT NULL;
