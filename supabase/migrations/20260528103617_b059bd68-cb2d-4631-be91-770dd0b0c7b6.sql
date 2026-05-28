
CREATE TABLE public.user_template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_template_favorites TO authenticated;
GRANT ALL ON public.user_template_favorites TO service_role;
ALTER TABLE public.user_template_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own template favorites" ON public.user_template_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own template favorites" ON public.user_template_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own template favorites" ON public.user_template_favorites FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.user_template_most_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_template_most_used TO authenticated;
GRANT ALL ON public.user_template_most_used TO service_role;
ALTER TABLE public.user_template_most_used ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own template most used" ON public.user_template_most_used FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own template most used" ON public.user_template_most_used FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own template most used" ON public.user_template_most_used FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own template most used" ON public.user_template_most_used FOR DELETE USING (auth.uid() = user_id);
