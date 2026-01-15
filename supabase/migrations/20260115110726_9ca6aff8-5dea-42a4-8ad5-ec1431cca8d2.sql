-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create trials table
CREATE TABLE public.trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acronym TEXT NOT NULL,
  title TEXT NOT NULL,
  disease_area TEXT NOT NULL,
  setting TEXT,
  line_of_therapy TEXT,
  phase TEXT,
  design_type TEXT,
  randomization TEXT,
  blinding TEXT,
  sample_size INTEGER,
  primary_endpoint TEXT,
  secondary_endpoints TEXT[],
  intervention_classes TEXT[],
  drugs TEXT[],
  biomarkers TEXT[],
  inclusion_criteria JSONB,
  exclusion_criteria JSONB,
  results_summary JSONB,
  safety_highlights TEXT,
  pubmed_id TEXT,
  doi TEXT,
  journal TEXT,
  publication_year INTEGER,
  authors TEXT[],
  abstract TEXT,
  citation TEXT,
  original_km_plot_url TEXT,
  is_open_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on trials
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;

-- Anyone can view trials (public)
CREATE POLICY "Anyone can view trials" ON public.trials FOR SELECT USING (true);
-- Only admins can insert/update/delete trials
CREATE POLICY "Admins can insert trials" ON public.trials FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update trials" ON public.trials FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete trials" ON public.trials FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create arms table
CREATE TABLE public.arms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_id UUID NOT NULL REFERENCES public.trials(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sample_size INTEGER,
  treatment_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on arms
ALTER TABLE public.arms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view arms" ON public.arms FOR SELECT USING (true);
CREATE POLICY "Admins can insert arms" ON public.arms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update arms" ON public.arms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete arms" ON public.arms FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create endpoints table for survival/response data
CREATE TABLE public.endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_id UUID NOT NULL REFERENCES public.trials(id) ON DELETE CASCADE,
  arm_id UUID REFERENCES public.arms(id) ON DELETE SET NULL,
  endpoint_name TEXT NOT NULL,
  endpoint_type TEXT NOT NULL,
  hazard_ratio NUMERIC,
  hazard_ratio_ci_lower NUMERIC,
  hazard_ratio_ci_upper NUMERIC,
  p_value NUMERIC,
  median_months NUMERIC,
  rate_percent NUMERIC,
  rate_timepoint_months INTEGER,
  survival_timepoints JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on endpoints
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view endpoints" ON public.endpoints FOR SELECT USING (true);
CREATE POLICY "Admins can insert endpoints" ON public.endpoints FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update endpoints" ON public.endpoints FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete endpoints" ON public.endpoints FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create AI summaries table with versioning
CREATE TABLE public.ai_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_id UUID NOT NULL REFERENCES public.trials(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL,
  content JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on ai_summaries
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view AI summaries" ON public.ai_summaries FOR SELECT USING (true);
CREATE POLICY "Admins can insert AI summaries" ON public.ai_summaries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update AI summaries" ON public.ai_summaries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trials_updated_at
  BEFORE UPDATE ON public.trials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();