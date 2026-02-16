
-- Replace the permissive SELECT policy on hospitals with admin-only access
DROP POLICY IF EXISTS "Users can view their own hospital" ON public.hospitals;

-- Only admins and super_admins can SELECT from the base hospitals table (which has billing data)
CREATE POLICY "Admins can view their own hospital"
  ON public.hospitals FOR SELECT
  USING (
    id = get_user_hospital_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );
