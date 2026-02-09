-- Fix: Restrict patient_folder_content writes to admin only
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert patient folder content" ON public.patient_folder_content;
DROP POLICY IF EXISTS "Authenticated users can update patient folder content" ON public.patient_folder_content;

-- Add admin-only policies
CREATE POLICY "Admins can insert patient folder content"
  ON public.patient_folder_content
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update patient folder content"
  ON public.patient_folder_content
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patient folder content"
  ON public.patient_folder_content
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));