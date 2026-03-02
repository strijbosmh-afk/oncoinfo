
-- Allow authenticated users to see profiles from their own hospital (needed for doctor/nurse selection)
CREATE POLICY "Users can view hospital colleagues"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (hospital_id = get_user_hospital_id(auth.uid()));
