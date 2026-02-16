CREATE OR REPLACE FUNCTION public.log_drug_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF OLD.is_on_zvz IS DISTINCT FROM NEW.is_on_zvz THEN
      _details := _details || jsonb_build_object('is_on_zvz', jsonb_build_object('old', COALESCE(OLD.is_on_zvz, false), 'new', COALESCE(NEW.is_on_zvz, false)));
    END IF;
    IF OLD.mechanism_of_action IS DISTINCT FROM NEW.mechanism_of_action THEN
      _details := _details || jsonb_build_object('mechanism_of_action', 'gewijzigd');
    END IF;
    IF OLD.administration_route IS DISTINCT FROM NEW.administration_route THEN
      _details := _details || jsonb_build_object('administration_route', jsonb_build_object('old', OLD.administration_route, 'new', NEW.administration_route));
    END IF;
    IF OLD.contraindications IS DISTINCT FROM NEW.contraindications THEN
      _details := _details || jsonb_build_object('contraindications', 'gewijzigd');
    END IF;
    IF OLD.monitoring_requirements IS DISTINCT FROM NEW.monitoring_requirements THEN
      _details := _details || jsonb_build_object('monitoring_requirements', 'gewijzigd');
    END IF;
    IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
      _details := _details || jsonb_build_object('unit_price', jsonb_build_object('old', OLD.unit_price, 'new', NEW.unit_price));
    END IF;
    IF OLD.brand_names IS DISTINCT FROM NEW.brand_names THEN
      _details := _details || jsonb_build_object('brand_names', jsonb_build_object('old', OLD.brand_names, 'new', NEW.brand_names));
    END IF;
    IF OLD.common_regimens IS DISTINCT FROM NEW.common_regimens THEN
      _details := _details || jsonb_build_object('common_regimens', 'gewijzigd');
    END IF;
    IF OLD.reference_links IS DISTINCT FROM NEW.reference_links THEN
      _details := _details || jsonb_build_object('reference_links', 'gewijzigd');
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
$function$;