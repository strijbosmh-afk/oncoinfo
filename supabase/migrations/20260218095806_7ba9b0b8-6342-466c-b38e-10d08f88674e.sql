
-- Drop the restrictive anon policy and recreate as permissive
DROP POLICY IF EXISTS "Anon can read active hospitals for login" ON public.hospitals;

CREATE POLICY "Anon can read active hospitals for login"
ON public.hospitals
FOR SELECT
TO anon
USING (is_active = true);

-- Also make the other SELECT policies permissive so they work independently
DROP POLICY IF EXISTS "Admins can view their own hospital" ON public.hospitals;

CREATE POLICY "Admins can view their own hospital"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id = get_user_hospital_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

DROP POLICY IF EXISTS "Platform admins can manage hospitals" ON public.hospitals;

CREATE POLICY "Platform admins can manage hospitals"
ON public.hospitals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
