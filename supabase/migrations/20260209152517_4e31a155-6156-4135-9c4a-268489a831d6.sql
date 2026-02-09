
CREATE OR REPLACE FUNCTION public.log_trial_change()
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
    _entity_name := NEW.acronym;
    _details := jsonb_build_object('title', NEW.title, 'disease_area', NEW.disease_area, 'phase', NEW.phase);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _entity_name := NEW.acronym;
    _details := '{}'::jsonb;
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      _details := _details || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF OLD.disease_area IS DISTINCT FROM NEW.disease_area THEN
      _details := _details || jsonb_build_object('disease_area', jsonb_build_object('old', OLD.disease_area, 'new', NEW.disease_area));
    END IF;
    IF OLD.phase IS DISTINCT FROM NEW.phase THEN
      _details := _details || jsonb_build_object('phase', jsonb_build_object('old', OLD.phase, 'new', NEW.phase));
    END IF;
    IF OLD.primary_endpoint_met IS DISTINCT FROM NEW.primary_endpoint_met THEN
      _details := _details || jsonb_build_object('primary_endpoint_met', jsonb_build_object('old', OLD.primary_endpoint_met, 'new', NEW.primary_endpoint_met));
    END IF;
    IF OLD.results_summary IS DISTINCT FROM NEW.results_summary THEN
      _details := _details || jsonb_build_object('results_summary', 'gewijzigd');
    END IF;
    IF OLD.abstract IS DISTINCT FROM NEW.abstract THEN
      _details := _details || jsonb_build_object('abstract', 'gewijzigd');
    END IF;
    IF OLD.drugs IS DISTINCT FROM NEW.drugs THEN
      _details := _details || jsonb_build_object('drugs', jsonb_build_object('old', to_jsonb(OLD.drugs), 'new', to_jsonb(NEW.drugs)));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _entity_name := OLD.acronym;
    _details := jsonb_build_object('title', OLD.title, 'disease_area', OLD.disease_area);
  END IF;

  INSERT INTO public.audit_log (user_id, username, action, entity_type, entity_id, entity_name, details)
  VALUES (_user_id, _username, _action, 'trial', COALESCE(NEW.id, OLD.id)::text, _entity_name, _details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_trial_changes
AFTER INSERT OR UPDATE OR DELETE ON public.trials
FOR EACH ROW EXECUTE FUNCTION public.log_trial_change();
