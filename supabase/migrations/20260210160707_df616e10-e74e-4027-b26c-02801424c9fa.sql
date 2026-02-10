
-- 1. Remove anonymous access to get_email_by_username to prevent username enumeration
-- The login-with-username edge function queries profiles directly with service role, so this function is not needed for anon.
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM anon;

-- 2. Fix audit_log: remove user-based INSERT policy to prevent log manipulation
-- Audit logs should only be created by triggers (SECURITY DEFINER) and edge functions (service role)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- Ensure no user can insert into audit_log directly
-- Triggers run as SECURITY DEFINER so they bypass RLS
-- Edge functions use service role which also bypasses RLS
