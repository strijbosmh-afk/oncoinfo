
-- Table to store per-user drug display order
CREATE TABLE public.user_drug_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, drug_id)
);

-- Enable RLS
ALTER TABLE public.user_drug_order ENABLE ROW LEVEL SECURITY;

-- Users can view their own order
CREATE POLICY "Users can view their own drug order"
ON public.user_drug_order
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own order
CREATE POLICY "Users can insert their own drug order"
ON public.user_drug_order
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own order
CREATE POLICY "Users can update their own drug order"
ON public.user_drug_order
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own order
CREATE POLICY "Users can delete their own drug order"
ON public.user_drug_order
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_drug_order_updated_at
BEFORE UPDATE ON public.user_drug_order
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
