
-- Step 1: Add hospital_id to profiles FIRST (before any policies reference it)
ALTER TABLE public.profiles ADD COLUMN hospital_id uuid;
ALTER TABLE public.drugs ADD COLUMN hospital_id uuid;
ALTER TABLE public.audit_log ADD COLUMN hospital_id uuid;
ALTER TABLE public.scheduled_auto_updates ADD COLUMN hospital_id uuid;
ALTER TABLE public.patient_folder_content ADD COLUMN hospital_id uuid;

-- Step 2: Create hospitals table
CREATE TABLE public.hospitals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  branding jsonb DEFAULT '{"primary_color": "#6b2d5b"}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Step 3: Add foreign keys now that hospitals table exists
ALTER TABLE public.profiles ADD CONSTRAINT profiles_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
ALTER TABLE public.drugs ADD CONSTRAINT drugs_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
ALTER TABLE public.scheduled_auto_updates ADD CONSTRAINT scheduled_auto_updates_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
ALTER TABLE public.patient_folder_content ADD CONSTRAINT patient_folder_content_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);

-- Step 4: Helper function
CREATE OR REPLACE FUNCTION public.get_user_hospital_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Step 5: RLS on hospitals
CREATE POLICY "Platform admins can manage hospitals"
  ON public.hospitals FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own hospital"
  ON public.hospitals FOR SELECT
  USING (id = get_user_hospital_id(auth.uid()));

-- Step 6: hospital_doctors table
CREATE TABLE public.hospital_doctors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialization text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage doctors"
  ON public.hospital_doctors FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Hospital users can view their doctors"
  ON public.hospital_doctors FOR SELECT
  USING (hospital_id = get_user_hospital_id(auth.uid()));

CREATE POLICY "Hospital admins can manage their doctors"
  ON public.hospital_doctors FOR ALL
  USING (
    hospital_id = get_user_hospital_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Step 7: hospital_drug_visibility table
CREATE TABLE public.hospital_drug_visibility (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, drug_id)
);

ALTER TABLE public.hospital_drug_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital users can view their visibility settings"
  ON public.hospital_drug_visibility FOR SELECT
  USING (hospital_id = get_user_hospital_id(auth.uid()));

CREATE POLICY "Hospital admins can manage visibility"
  ON public.hospital_drug_visibility FOR ALL
  USING (
    hospital_id = get_user_hospital_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Platform admins can manage all visibility"
  ON public.hospital_drug_visibility FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Step 8: Triggers
CREATE TRIGGER update_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hospital_doctors_updated_at
  BEFORE UPDATE ON public.hospital_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 9: Insert RZ Tienen
INSERT INTO public.hospitals (name, slug, logo_url, branding)
VALUES ('RZ Tienen', 'rztienen', '/images/logo-rzt.png', '{"primary_color": "#6b2d5b"}');

-- Step 10: Migrate existing data to RZ Tienen
UPDATE public.profiles SET hospital_id = (SELECT id FROM public.hospitals WHERE slug = 'rztienen') WHERE hospital_id IS NULL;
UPDATE public.drugs SET hospital_id = NULL WHERE hospital_id IS NULL; -- platform drugs stay NULL
UPDATE public.audit_log SET hospital_id = (SELECT id FROM public.hospitals WHERE slug = 'rztienen') WHERE hospital_id IS NULL;
UPDATE public.scheduled_auto_updates SET hospital_id = (SELECT id FROM public.hospitals WHERE slug = 'rztienen') WHERE hospital_id IS NULL;
