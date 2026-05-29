-- 1. Prevent privilege escalation via profile self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Platform admins and hospital admins may change anything
  IF has_role(auth.uid(), 'super_admin'::app_role)
     OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Regular users may NOT change their role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to modify role';
  END IF;

  -- Regular users may NOT change dedicated_nurse_id
  IF NEW.dedicated_nurse_id IS DISTINCT FROM OLD.dedicated_nurse_id THEN
    RAISE EXCEPTION 'Not allowed to modify dedicated nurse assignment';
  END IF;

  -- Regular users may only switch to a hospital they are linked to
  IF NEW.hospital_id IS DISTINCT FROM OLD.hospital_id THEN
    IF NEW.hospital_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.user_hospitals uh
         WHERE uh.user_id = NEW.user_id
           AND uh.hospital_id = NEW.hospital_id
       ) THEN
      RAISE EXCEPTION 'Not allowed to assign an unlinked hospital';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Restrict anonymous access to hospitals to non-billing columns only (column-level privileges)
REVOKE SELECT ON public.hospitals FROM anon;
GRANT SELECT (
  id, name, slug, logo_url, branding, is_active,
  display_order, created_at, updated_at, default_language
) ON public.hospitals TO anon;

-- 3. login_attempts: explicit read policy for platform admins only
DROP POLICY IF EXISTS "Super admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Super admins can view login attempts"
  ON public.login_attempts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
