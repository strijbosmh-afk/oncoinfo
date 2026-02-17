-- Allow anonymous users to read active hospitals via hospitals_public view
-- This is needed for the hospital selector on the login page
CREATE POLICY "Anon can read active hospitals for login"
ON public.hospitals
FOR SELECT
TO anon
USING (is_active = true);
