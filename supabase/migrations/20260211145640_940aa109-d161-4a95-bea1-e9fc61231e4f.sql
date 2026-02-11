-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view active hospitals" ON public.hospitals;

CREATE POLICY "Anyone can view active hospitals"
ON public.hospitals
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (is_active = true);
