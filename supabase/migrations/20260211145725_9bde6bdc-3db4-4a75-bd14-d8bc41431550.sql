-- Fix remaining restrictive policies on hospitals to be permissive
DROP POLICY IF EXISTS "Users can view their own hospital" ON public.hospitals;
CREATE POLICY "Users can view their own hospital"
ON public.hospitals
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (id = get_user_hospital_id(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage hospitals" ON public.hospitals;
CREATE POLICY "Platform admins can manage hospitals"
ON public.hospitals
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
