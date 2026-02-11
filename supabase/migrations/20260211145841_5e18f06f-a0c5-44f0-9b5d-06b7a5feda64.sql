-- =============================================
-- Fix ALL restrictive policies to be permissive
-- =============================================

-- === PROFILES ===
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hospital admins can view hospital profiles" ON public.profiles;
CREATE POLICY "Hospital admins can view hospital profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Hospital admins can delete hospital profiles" ON public.profiles;
CREATE POLICY "Hospital admins can delete hospital profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;
CREATE POLICY "Platform admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Platform admins can delete any profile" ON public.profiles;
CREATE POLICY "Platform admins can delete any profile" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- === USER_ROLES ===
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Hospital admins can view hospital user roles" ON public.user_roles;
CREATE POLICY "Hospital admins can view hospital user roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Hospital admins can insert hospital user roles" ON public.user_roles;
CREATE POLICY "Hospital admins can insert hospital user roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Hospital admins can update hospital user roles" ON public.user_roles;
CREATE POLICY "Hospital admins can update hospital user roles" ON public.user_roles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Hospital admins can delete hospital user roles" ON public.user_roles;
CREATE POLICY "Hospital admins can delete hospital user roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;
CREATE POLICY "Platform admins can manage all roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- === USER_PERMISSIONS ===
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
CREATE POLICY "Users can view own permissions" ON public.user_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hospital admins can view hospital permissions" ON public.user_permissions;
CREATE POLICY "Hospital admins can view hospital permissions" ON public.user_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Hospital admins can insert hospital permissions" ON public.user_permissions;
CREATE POLICY "Hospital admins can insert hospital permissions" ON public.user_permissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Hospital admins can update hospital permissions" ON public.user_permissions;
CREATE POLICY "Hospital admins can update hospital permissions" ON public.user_permissions AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Hospital admins can delete hospital permissions" ON public.user_permissions;
CREATE POLICY "Hospital admins can delete hospital permissions" ON public.user_permissions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.hospital_id = get_user_hospital_id(auth.uid())));

DROP POLICY IF EXISTS "Platform admins can manage all permissions" ON public.user_permissions;
CREATE POLICY "Platform admins can manage all permissions" ON public.user_permissions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- === DRUGS ===
DROP POLICY IF EXISTS "Users see platform and hospital drugs" ON public.drugs;
CREATE POLICY "Users see platform and hospital drugs" ON public.drugs AS PERMISSIVE FOR SELECT TO authenticated USING (hospital_id IS NULL OR hospital_id = get_user_hospital_id(auth.uid()));

DROP POLICY IF EXISTS "Hospital admins can insert drugs" ON public.drugs;
CREATE POLICY "Hospital admins can insert drugs" ON public.drugs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role)));

DROP POLICY IF EXISTS "Hospital admins can update drugs" ON public.drugs;
CREATE POLICY "Hospital admins can update drugs" ON public.drugs AS PERMISSIVE FOR UPDATE TO authenticated USING ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role)));

DROP POLICY IF EXISTS "Hospital admins can delete drugs" ON public.drugs;
CREATE POLICY "Hospital admins can delete drugs" ON public.drugs AS PERMISSIVE FOR DELETE TO authenticated USING ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role)));

-- === HOSPITAL_DOCTORS ===
DROP POLICY IF EXISTS "Hospital users can view their doctors" ON public.hospital_doctors;
CREATE POLICY "Hospital users can view their doctors" ON public.hospital_doctors AS PERMISSIVE FOR SELECT TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()));

DROP POLICY IF EXISTS "Hospital admins can manage their doctors" ON public.hospital_doctors;
CREATE POLICY "Hospital admins can manage their doctors" ON public.hospital_doctors AS PERMISSIVE FOR ALL TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Platform admins can manage doctors" ON public.hospital_doctors;
CREATE POLICY "Platform admins can manage doctors" ON public.hospital_doctors AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- === HOSPITAL_DRUG_VISIBILITY ===
DROP POLICY IF EXISTS "Hospital users can view their visibility settings" ON public.hospital_drug_visibility;
CREATE POLICY "Hospital users can view their visibility settings" ON public.hospital_drug_visibility AS PERMISSIVE FOR SELECT TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()));

DROP POLICY IF EXISTS "Hospital admins can manage visibility" ON public.hospital_drug_visibility;
CREATE POLICY "Hospital admins can manage visibility" ON public.hospital_drug_visibility AS PERMISSIVE FOR ALL TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Platform admins can manage all visibility" ON public.hospital_drug_visibility;
CREATE POLICY "Platform admins can manage all visibility" ON public.hospital_drug_visibility AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- === PATIENT_FOLDER_CONTENT ===
DROP POLICY IF EXISTS "Users see platform and hospital folder content" ON public.patient_folder_content;
CREATE POLICY "Users see platform and hospital folder content" ON public.patient_folder_content AS PERMISSIVE FOR SELECT TO authenticated USING (hospital_id IS NULL OR hospital_id = get_user_hospital_id(auth.uid()));

DROP POLICY IF EXISTS "Hospital admins can insert folder content" ON public.patient_folder_content;
CREATE POLICY "Hospital admins can insert folder content" ON public.patient_folder_content AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role)));

DROP POLICY IF EXISTS "Hospital admins can update folder content" ON public.patient_folder_content;
CREATE POLICY "Hospital admins can update folder content" ON public.patient_folder_content AS PERMISSIVE FOR UPDATE TO authenticated USING ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role)));

DROP POLICY IF EXISTS "Hospital admins can delete folder content" ON public.patient_folder_content;
CREATE POLICY "Hospital admins can delete folder content" ON public.patient_folder_content AS PERMISSIVE FOR DELETE TO authenticated USING ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role)));

-- === USER_DRUG_ORDER ===
DROP POLICY IF EXISTS "Users can view their own drug order" ON public.user_drug_order;
CREATE POLICY "Users can view their own drug order" ON public.user_drug_order AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own drug order" ON public.user_drug_order;
CREATE POLICY "Users can insert their own drug order" ON public.user_drug_order AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own drug order" ON public.user_drug_order;
CREATE POLICY "Users can update their own drug order" ON public.user_drug_order AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own drug order" ON public.user_drug_order;
CREATE POLICY "Users can delete their own drug order" ON public.user_drug_order AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- === AUDIT_LOG ===
DROP POLICY IF EXISTS "Hospital admins can view hospital audit logs" ON public.audit_log;
CREATE POLICY "Hospital admins can view hospital audit logs" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_log;
CREATE POLICY "Admins can insert audit logs" ON public.audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- === SCHEDULED_AUTO_UPDATES ===
DROP POLICY IF EXISTS "Hospital admins can manage their schedules" ON public.scheduled_auto_updates;
CREATE POLICY "Hospital admins can manage their schedules" ON public.scheduled_auto_updates AS PERMISSIVE FOR ALL TO authenticated USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Platform admins can manage all schedules" ON public.scheduled_auto_updates;
CREATE POLICY "Platform admins can manage all schedules" ON public.scheduled_auto_updates AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- === TRIALS (public data) ===
DROP POLICY IF EXISTS "Anyone can view trials" ON public.trials;
CREATE POLICY "Anyone can view trials" ON public.trials AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert trials" ON public.trials;
CREATE POLICY "Admins can insert trials" ON public.trials AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update trials" ON public.trials;
CREATE POLICY "Admins can update trials" ON public.trials AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete trials" ON public.trials;
CREATE POLICY "Admins can delete trials" ON public.trials AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === ARMS (public data) ===
DROP POLICY IF EXISTS "Anyone can view arms" ON public.arms;
CREATE POLICY "Anyone can view arms" ON public.arms AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert arms" ON public.arms;
CREATE POLICY "Admins can insert arms" ON public.arms AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update arms" ON public.arms;
CREATE POLICY "Admins can update arms" ON public.arms AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete arms" ON public.arms;
CREATE POLICY "Admins can delete arms" ON public.arms AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === ENDPOINTS (public data) ===
DROP POLICY IF EXISTS "Anyone can view endpoints" ON public.endpoints;
CREATE POLICY "Anyone can view endpoints" ON public.endpoints AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert endpoints" ON public.endpoints;
CREATE POLICY "Admins can insert endpoints" ON public.endpoints AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update endpoints" ON public.endpoints;
CREATE POLICY "Admins can update endpoints" ON public.endpoints AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete endpoints" ON public.endpoints;
CREATE POLICY "Admins can delete endpoints" ON public.endpoints AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === AI_SUMMARIES ===
DROP POLICY IF EXISTS "Anyone can view AI summaries" ON public.ai_summaries;
CREATE POLICY "Anyone can view AI summaries" ON public.ai_summaries AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert AI summaries" ON public.ai_summaries;
CREATE POLICY "Admins can insert AI summaries" ON public.ai_summaries AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update AI summaries" ON public.ai_summaries;
CREATE POLICY "Admins can update AI summaries" ON public.ai_summaries AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
