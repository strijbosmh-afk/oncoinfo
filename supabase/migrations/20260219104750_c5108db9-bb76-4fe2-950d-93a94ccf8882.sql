-- Add a PERMISSIVE policy so authenticated users can read their own hospital via hospitals_public view
CREATE POLICY "Users can view their own hospital"
  ON public.hospitals
  FOR SELECT
  TO authenticated
  USING (id = get_user_hospital_id(auth.uid()));
