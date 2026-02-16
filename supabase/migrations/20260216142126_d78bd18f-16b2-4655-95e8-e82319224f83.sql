
-- Table for "most used" drugs per user (max 8, enforced in app)
CREATE TABLE public.user_most_used (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, drug_id)
);

-- Enable RLS
ALTER TABLE public.user_most_used ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own most-used drugs
CREATE POLICY "Users can view their own most used"
ON public.user_most_used FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own most used"
ON public.user_most_used FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own most used"
ON public.user_most_used FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own most used"
ON public.user_most_used FOR DELETE
USING (auth.uid() = user_id);
