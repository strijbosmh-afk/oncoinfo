-- Table to track which premium features a hospital has access to
CREATE TABLE public.hospital_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.hospital_features ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital users can view their features"
ON public.hospital_features AS PERMISSIVE
FOR SELECT TO authenticated
USING (hospital_id = get_user_hospital_id(auth.uid()));

CREATE POLICY "Platform admins can manage all features"
ON public.hospital_features AS PERMISSIVE
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_hospital_features_updated_at
BEFORE UPDATE ON public.hospital_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
