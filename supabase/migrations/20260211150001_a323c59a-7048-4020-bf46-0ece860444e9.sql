-- Table to track which disease areas (disciplines) a hospital has access to
-- This will become a paid feature: pay per discipline
CREATE TABLE public.hospital_disciplines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  disease_area text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, disease_area)
);

-- Enable RLS
ALTER TABLE public.hospital_disciplines ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital users can view their disciplines"
ON public.hospital_disciplines AS PERMISSIVE
FOR SELECT TO authenticated
USING (hospital_id = get_user_hospital_id(auth.uid()));

CREATE POLICY "Platform admins can manage all disciplines"
ON public.hospital_disciplines AS PERMISSIVE
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_hospital_disciplines_updated_at
BEFORE UPDATE ON public.hospital_disciplines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
