
-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text,
  action text NOT NULL, -- 'login', 'create', 'update', 'delete'
  entity_type text, -- 'drug', 'trial', 'user', etc.
  entity_id text,
  entity_name text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_action ON public.audit_log (action);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts (via triggers and edge functions), so allow insert for authenticated
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also allow admin insert for system-level logging
CREATE POLICY "Admins can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function to log drug changes
CREATE OR REPLACE FUNCTION public.log_drug_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _details jsonb;
  _user_id uuid;
  _username text;
  _entity_name text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT username INTO _username FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _entity_name := NEW.generic_name;
    _details := jsonb_build_object('drug_class', NEW.drug_class, 'disease_areas', NEW.disease_areas);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _entity_name := NEW.generic_name;
    -- Track which fields changed
    _details := '{}'::jsonb;
    IF OLD.generic_name IS DISTINCT FROM NEW.generic_name THEN
      _details := _details || jsonb_build_object('generic_name', jsonb_build_object('old', OLD.generic_name, 'new', NEW.generic_name));
    END IF;
    IF OLD.drug_class IS DISTINCT FROM NEW.drug_class THEN
      _details := _details || jsonb_build_object('drug_class', jsonb_build_object('old', OLD.drug_class, 'new', NEW.drug_class));
    END IF;
    IF OLD.disease_areas IS DISTINCT FROM NEW.disease_areas THEN
      _details := _details || jsonb_build_object('disease_areas', jsonb_build_object('old', OLD.disease_areas, 'new', NEW.disease_areas));
    END IF;
    IF OLD.approved_indications IS DISTINCT FROM NEW.approved_indications THEN
      _details := _details || jsonb_build_object('approved_indications', 'gewijzigd');
    END IF;
    IF OLD.side_effects IS DISTINCT FROM NEW.side_effects THEN
      _details := _details || jsonb_build_object('side_effects', 'gewijzigd');
    END IF;
    IF OLD.dosing_info IS DISTINCT FROM NEW.dosing_info THEN
      _details := _details || jsonb_build_object('dosing_info', 'gewijzigd');
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _entity_name := OLD.generic_name;
    _details := jsonb_build_object('drug_class', OLD.drug_class);
  END IF;

  INSERT INTO public.audit_log (user_id, username, action, entity_type, entity_id, entity_name, details)
  VALUES (_user_id, _username, _action, 'drug', COALESCE(NEW.id, OLD.id)::text, _entity_name, _details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to drugs table
CREATE TRIGGER audit_drug_changes
AFTER INSERT OR UPDATE OR DELETE ON public.drugs
FOR EACH ROW EXECUTE FUNCTION public.log_drug_change();

-- Create trigger function to log patient_folder_content changes
CREATE OR REPLACE FUNCTION public.log_patient_folder_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _username text;
  _drug_name text;
  _action text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT username INTO _username FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  SELECT generic_name INTO _drug_name FROM public.drugs WHERE id = COALESCE(NEW.drug_id, OLD.drug_id) LIMIT 1;

  IF TG_OP = 'INSERT' THEN _action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN _action := 'update';
  ELSE _action := 'delete';
  END IF;

  INSERT INTO public.audit_log (user_id, username, action, entity_type, entity_id, entity_name, details)
  VALUES (_user_id, _username, _action, 'patient_folder', COALESCE(NEW.drug_id, OLD.drug_id)::text, _drug_name,
    jsonb_build_object('type', 'patiëntenfolder'));

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_patient_folder_changes
AFTER INSERT OR UPDATE OR DELETE ON public.patient_folder_content
FOR EACH ROW EXECUTE FUNCTION public.log_patient_folder_change();
