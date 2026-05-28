
-- Source documents (one current per hospital, or platform-wide when hospital_id IS NULL)
CREATE TABLE public.discharge_letter_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NULL,
  document_title TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX discharge_letter_documents_hospital_unique
  ON public.discharge_letter_documents ((COALESCE(hospital_id::text, 'PLATFORM')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discharge_letter_documents TO authenticated;
GRANT ALL ON public.discharge_letter_documents TO service_role;

ALTER TABLE public.discharge_letter_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital users can view their document"
  ON public.discharge_letter_documents FOR SELECT TO authenticated
  USING (
    hospital_id IS NULL
    OR hospital_id = get_user_hospital_id(auth.uid())
  );

CREATE POLICY "Hospital admins can manage their document"
  ON public.discharge_letter_documents FOR ALL TO authenticated
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  )
  WITH CHECK (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );

-- Extracted templates
CREATE TABLE public.discharge_letter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.discharge_letter_documents(id) ON DELETE CASCADE,
  hospital_id UUID NULL,
  discipline TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discharge_letter_templates_discipline_idx
  ON public.discharge_letter_templates (discipline);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discharge_letter_templates TO authenticated;
GRANT ALL ON public.discharge_letter_templates TO service_role;

ALTER TABLE public.discharge_letter_templates ENABLE ROW LEVEL SECURITY;

-- Visibility: only physicians (or admins) of the matching hospital
CREATE POLICY "Physicians can view templates"
  ON public.discharge_letter_templates FOR SELECT TO authenticated
  USING (
    (hospital_id IS NULL OR hospital_id = get_user_hospital_id(auth.uid()))
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = auth.uid() AND up.is_physician = true
      )
    )
  );

CREATE POLICY "Hospital admins can manage templates"
  ON public.discharge_letter_templates FOR ALL TO authenticated
  USING (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  )
  WITH CHECK (
    (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR (hospital_id IS NULL AND has_role(auth.uid(), 'super_admin'::app_role))
  );
