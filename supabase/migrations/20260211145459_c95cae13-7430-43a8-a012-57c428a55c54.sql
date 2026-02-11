-- Allow anonymous users to read active hospitals (needed for login page)
CREATE POLICY "Anyone can view active hospitals"
ON public.hospitals
FOR SELECT
USING (is_active = true);
