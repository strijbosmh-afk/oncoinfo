-- Create table for custom patient folder content per drug
CREATE TABLE public.patient_folder_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  introduction TEXT,
  usage_info TEXT,
  dosing_info TEXT,
  contraindications TEXT,
  side_effects_common TEXT,
  side_effects_serious TEXT,
  tips TEXT,
  monitoring TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drug_id)
);

-- Enable RLS
ALTER TABLE public.patient_folder_content ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone (public info)
CREATE POLICY "Patient folder content is readable by everyone"
  ON public.patient_folder_content
  FOR SELECT
  USING (true);

-- Allow insert/update for authenticated users (editors)
CREATE POLICY "Authenticated users can insert patient folder content"
  ON public.patient_folder_content
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update patient folder content"
  ON public.patient_folder_content
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_patient_folder_content_updated_at
  BEFORE UPDATE ON public.patient_folder_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();