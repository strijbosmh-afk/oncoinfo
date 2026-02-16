
CREATE TABLE public.user_specialty_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  specialty_keys TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_specialty_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own specialty order"
ON public.user_specialty_order FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own specialty order"
ON public.user_specialty_order FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own specialty order"
ON public.user_specialty_order FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own specialty order"
ON public.user_specialty_order FOR DELETE
USING (auth.uid() = user_id);
