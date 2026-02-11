
-- =============================================
-- STEP 2: Rewrite all RLS policies for multi-tenant hospital isolation
-- =============================================

-- ============ DRUGS ============
-- Drop existing
DROP POLICY IF EXISTS "Anyone can view drugs" ON public.drugs;
DROP POLICY IF EXISTS "Admins can delete drugs" ON public.drugs;
DROP POLICY IF EXISTS "Admins can insert drugs" ON public.drugs;
DROP POLICY IF EXISTS "Admins can update drugs" ON public.drugs;

-- New: users see platform drugs (NULL) + own hospital drugs
CREATE POLICY "Users see platform and hospital drugs"
  ON public.drugs FOR SELECT
  USING (
    hospital_id IS NULL
    OR hospital_id = get_user_hospital_id(auth.uid())
  );

-- Hospital admins can manage their own hospital's drugs
CREATE POLICY "Hospital admins can insert drugs"
  ON public.drugs FOR INSERT
  WITH CHECK (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Hospital admins can update drugs"
  ON public.drugs FOR UPDATE
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Hospital admins can delete drugs"
  ON public.drugs FOR DELETE
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;

-- Users see own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Hospital admins see profiles in their hospital
CREATE POLICY "Hospital admins can view hospital profiles"
  ON public.profiles FOR SELECT
  USING (
    hospital_id = get_user_hospital_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Platform admins see all
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users update own
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert own
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Hospital admins can delete profiles in their hospital
CREATE POLICY "Hospital admins can delete hospital profiles"
  ON public.profiles FOR DELETE
  USING (
    hospital_id = get_user_hospital_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Platform admins can delete any
CREATE POLICY "Platform admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ AUDIT_LOG ============
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_log;

-- Hospital admins see their hospital's logs
CREATE POLICY "Hospital admins can view hospital audit logs"
  ON public.audit_log FOR SELECT
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Insert via triggers only (admin insert for service role compatibility)
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============ PATIENT_FOLDER_CONTENT ============
DROP POLICY IF EXISTS "Patient folder content is readable by everyone" ON public.patient_folder_content;
DROP POLICY IF EXISTS "Admins can insert patient folder content" ON public.patient_folder_content;
DROP POLICY IF EXISTS "Admins can update patient folder content" ON public.patient_folder_content;
DROP POLICY IF EXISTS "Admins can delete patient folder content" ON public.patient_folder_content;

-- Users see platform content + own hospital content
CREATE POLICY "Users see platform and hospital folder content"
  ON public.patient_folder_content FOR SELECT
  USING (
    hospital_id IS NULL
    OR hospital_id = get_user_hospital_id(auth.uid())
  );

CREATE POLICY "Hospital admins can insert folder content"
  ON public.patient_folder_content FOR INSERT
  WITH CHECK (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Hospital admins can update folder content"
  ON public.patient_folder_content FOR UPDATE
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Hospital admins can delete folder content"
  ON public.patient_folder_content FOR DELETE
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

-- ============ SCHEDULED_AUTO_UPDATES ============
DROP POLICY IF EXISTS "Super admins can manage schedules" ON public.scheduled_auto_updates;

-- Hospital admins manage their own schedules
CREATE POLICY "Hospital admins can manage their schedules"
  ON public.scheduled_auto_updates FOR ALL
  USING (
    hospital_id = get_user_hospital_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Platform admins manage all
CREATE POLICY "Platform admins can manage all schedules"
  ON public.scheduled_auto_updates FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ USER_ROLES ============
-- Keep user's own view, but scope admin view to hospital
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
-- Keep: "Users can view their own roles"

-- Hospital admins manage roles for users in their hospital
CREATE POLICY "Hospital admins can view hospital user roles"
  ON public.user_roles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

CREATE POLICY "Hospital admins can insert hospital user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

CREATE POLICY "Hospital admins can update hospital user roles"
  ON public.user_roles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

CREATE POLICY "Hospital admins can delete hospital user roles"
  ON public.user_roles FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ USER_PERMISSIONS ============
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.user_permissions;

-- Users see own
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Hospital admins manage permissions for their hospital's users
CREATE POLICY "Hospital admins can view hospital permissions"
  ON public.user_permissions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

CREATE POLICY "Hospital admins can insert hospital permissions"
  ON public.user_permissions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

CREATE POLICY "Hospital admins can update hospital permissions"
  ON public.user_permissions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

CREATE POLICY "Hospital admins can delete hospital permissions"
  ON public.user_permissions FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid()))
  );

-- Platform admins can manage all permissions
CREATE POLICY "Platform admins can manage all permissions"
  ON public.user_permissions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));
