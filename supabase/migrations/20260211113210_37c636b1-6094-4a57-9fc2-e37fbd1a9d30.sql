
-- Create scheduled_auto_updates table
CREATE TABLE public.scheduled_auto_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  schedule_interval TEXT NOT NULL CHECK (schedule_interval IN ('weekly', 'monthly', 'quarterly')),
  disease_areas TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_auto_updates ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage schedules
CREATE POLICY "Super admins can manage schedules"
ON public.scheduled_auto_updates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_auto_updates_updated_at
BEFORE UPDATE ON public.scheduled_auto_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Assign super_admin role to the 'admin' user
INSERT INTO public.user_roles (user_id, role)
VALUES ('0c0cb2b8-9903-4c30-abb8-ec6211eb611d', 'super_admin');
