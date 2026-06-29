-- 1. audit_log: restrict INSERT so admins can only insert their own hospital/user rows
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_log;
CREATE POLICY "Admins can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id = auth.uid()
    AND hospital_id = get_user_hospital_id(auth.uid())
  )
);

-- 2. hospitals: remove broad anon SELECT policy (anon has no column grants and uses
-- the restricted hospitals_public view instead). This removes reliance on column
-- grants as the sole defence against full-row exposure.
DROP POLICY IF EXISTS "Anon can read active hospitals for login" ON public.hospitals;

-- 3. platform_updates: restrict active-update visibility to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can view active updates" ON public.platform_updates;
CREATE POLICY "Authenticated users can view active updates"
ON public.platform_updates
FOR SELECT
TO authenticated
USING (is_active = true);