
-- 1. Create triggers for drug audit logging (function already exists)
CREATE TRIGGER log_drug_changes
AFTER INSERT OR UPDATE OR DELETE ON public.drugs
FOR EACH ROW EXECUTE FUNCTION public.log_drug_change();

-- 2. Create user_permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_physician boolean NOT NULL DEFAULT false,
  can_add_treatments boolean NOT NULL DEFAULT false,
  can_delete_treatments boolean NOT NULL DEFAULT false,
  can_modify_treatments boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions"
ON public.user_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage permissions
CREATE POLICY "Admins can insert permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update permissions"
ON public.user_permissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete permissions"
ON public.user_permissions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed permissions for existing users
INSERT INTO public.user_permissions (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
