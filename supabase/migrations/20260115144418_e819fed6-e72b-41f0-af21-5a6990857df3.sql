-- Create drugs table for GU oncology drug library
CREATE TABLE public.drugs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_name TEXT NOT NULL,
  brand_names TEXT[] DEFAULT '{}',
  drug_class TEXT NOT NULL, -- IO/ICI, PARPi, ARPI, Chemotherapy, TKI, ADC, Radioligand, etc.
  mechanism_of_action TEXT,
  disease_areas TEXT[] DEFAULT '{}', -- Prostate, Bladder, Kidney, Testicular, Penile
  approved_indications TEXT[],
  common_regimens TEXT[],
  dosing_info JSONB, -- structured dosing information
  administration_route TEXT, -- IV, Oral, Subcutaneous, etc.
  cycle_length_days INTEGER,
  side_effects JSONB, -- { common: [], serious: [], management: {} }
  contraindications TEXT[],
  drug_interactions TEXT[],
  monitoring_requirements TEXT[],
  patient_counseling_points TEXT[],
  ema_approval_date DATE,
  fda_approval_date DATE,
  is_on_zvz BOOLEAN DEFAULT false, -- Dutch insurance coverage
  reference_links TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;

-- Anyone can view drugs (public resource)
CREATE POLICY "Anyone can view drugs" 
ON public.drugs 
FOR SELECT 
USING (true);

-- Only admins can insert drugs
CREATE POLICY "Admins can insert drugs" 
ON public.drugs 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Only admins can update drugs
CREATE POLICY "Admins can update drugs" 
ON public.drugs 
FOR UPDATE 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Only admins can delete drugs
CREATE POLICY "Admins can delete drugs" 
ON public.drugs 
FOR DELETE 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_drugs_updated_at
BEFORE UPDATE ON public.drugs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster searches
CREATE INDEX idx_drugs_drug_class ON public.drugs(drug_class);
CREATE INDEX idx_drugs_generic_name ON public.drugs USING gin(to_tsvector('english', generic_name));
CREATE INDEX idx_drugs_disease_areas ON public.drugs USING gin(disease_areas);