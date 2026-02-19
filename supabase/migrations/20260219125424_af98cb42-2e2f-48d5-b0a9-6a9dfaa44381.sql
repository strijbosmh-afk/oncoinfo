
-- Many-to-many table linking users to hospitals
CREATE TABLE public.user_hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hospital_id)
);

-- Enable RLS
ALTER TABLE public.user_hospitals ENABLE ROW LEVEL SECURITY;

-- Users can view their own hospital links
CREATE POLICY "Users can view own hospital links"
  ON public.user_hospitals FOR SELECT
  USING (auth.uid() = user_id);

-- Hospital admins can view links for their hospital
CREATE POLICY "Hospital admins can view hospital user links"
  ON public.user_hospitals FOR SELECT
  USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Super admins can manage all links
CREATE POLICY "Platform admins can manage all user hospital links"
  ON public.user_hospitals FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Hospital admins can manage links for their hospital
CREATE POLICY "Hospital admins can insert hospital user links"
  ON public.user_hospitals FOR INSERT
  WITH CHECK (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Hospital admins can delete hospital user links"
  ON public.user_hospitals FOR DELETE
  USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Seed existing data: copy current profile hospital_id into user_hospitals
INSERT INTO public.user_hospitals (user_id, hospital_id)
SELECT user_id, hospital_id FROM public.profiles WHERE hospital_id IS NOT NULL
ON CONFLICT DO NOTHING;
