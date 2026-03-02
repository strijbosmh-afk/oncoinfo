
-- Create hospital-specific filter tags per drug
CREATE TABLE public.hospital_drug_filter_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  filter_tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, drug_id)
);

-- Enable RLS
ALTER TABLE public.hospital_drug_filter_tags ENABLE ROW LEVEL SECURITY;

-- Users can view their hospital's filter tags
CREATE POLICY "Hospital users can view their filter tags"
ON public.hospital_drug_filter_tags
FOR SELECT
USING (hospital_id = get_user_hospital_id(auth.uid()));

-- Admins can manage their hospital's filter tags
CREATE POLICY "Hospital admins can manage filter tags"
ON public.hospital_drug_filter_tags
FOR ALL
USING (hospital_id = get_user_hospital_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Super admins can manage all filter tags
CREATE POLICY "Platform admins can manage all filter tags"
ON public.hospital_drug_filter_tags
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_hospital_drug_filter_tags_updated_at
BEFORE UPDATE ON public.hospital_drug_filter_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
