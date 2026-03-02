
-- Table for platform update announcements
CREATE TABLE public.platform_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage updates"
  ON public.platform_updates FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users can view active updates"
  ON public.platform_updates FOR SELECT
  USING (is_active = true);

-- Table to track which users have seen which update
CREATE TABLE public.platform_update_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.platform_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(update_id, user_id)
);

ALTER TABLE public.platform_update_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads"
  ON public.platform_update_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reads"
  ON public.platform_update_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all reads"
  ON public.platform_update_reads FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));
