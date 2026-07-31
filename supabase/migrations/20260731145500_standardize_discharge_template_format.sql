CREATE OR REPLACE FUNCTION public.format_discharge_template_content(
  template_title text,
  template_discipline text,
  template_content text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  separator constant text := '--------------------------------------';
  missing_text constant text := 'Niet gespecificeerd in het brondocument.';
  normalized_title text;
  source_line text;
  clean_line text;
  section_name text := 'explanation';
  explanation_lines text[] := ARRAY[]::text[];
  side_effect_lines text[] := ARRAY[]::text[];
  referral_lines text[] := ARRAY[]::text[];
  explanation_text text;
  side_effect_text text;
  referral_text text;
BEGIN
  normalized_title := btrim(regexp_replace(COALESCE(template_title, ''), '^\s*ter info:\s*', '', 'i'));
  normalized_title := regexp_replace(normalized_title, '\s*[—–]\s*', ' - ', 'g');
  IF position(' - ' IN normalized_title) = 0 THEN
    normalized_title := normalized_title || ' - ' || COALESCE(NULLIF(btrim(template_discipline), ''), 'Indicatie volgens behandelplan');
  END IF;

  FOREACH source_line IN ARRAY regexp_split_to_array(COALESCE(template_content, ''), E'\r?\n') LOOP
    clean_line := btrim(source_line);
    IF clean_line = '' OR clean_line ~* '^ter info:' OR clean_line ~ '^-{3,}$' THEN
      CONTINUE;
    ELSIF clean_line ~* '^verwachte nevenwerkingen\s*:?$' THEN
      section_name := 'side_effects';
      CONTINUE;
    ELSIF clean_line ~* '^[-•]?\s*(indicaties?( tot)? (door)?verwijzing.*|contacteer .* bij)\s*:?$' THEN
      section_name := 'referrals';
      CONTINUE;
    END IF;

    clean_line := btrim(regexp_replace(clean_line, '^\s*[-•]\s*', ''));
    IF section_name = 'side_effects' THEN
      side_effect_lines := array_append(side_effect_lines, clean_line);
    ELSIF section_name = 'referrals' THEN
      referral_lines := array_append(referral_lines, clean_line);
    ELSE
      explanation_lines := array_append(explanation_lines, clean_line);
    END IF;
  END LOOP;

  explanation_text := CASE WHEN cardinality(explanation_lines) > 0
    THEN array_to_string(explanation_lines, E'\n') ELSE missing_text END;
  side_effect_text := CASE WHEN cardinality(side_effect_lines) > 0
    THEN '- ' || array_to_string(side_effect_lines, E'\n- ') ELSE '- ' || missing_text END;
  referral_text := CASE WHEN cardinality(referral_lines) > 0
    THEN '- ' || array_to_string(referral_lines, E'\n- ') ELSE '- ' || missing_text END;

  RETURN 'Ter info: ' || normalized_title || E'\n'
    || separator || E'\n'
    || explanation_text || E'\n\n'
    || 'Verwachte nevenwerkingen' || E'\n'
    || side_effect_text || E'\n\n'
    || 'Indicaties doorverwijzing' || E'\n'
    || referral_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_discharge_template_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.content := public.format_discharge_template_content(NEW.title, NEW.discipline, NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_discharge_template_format_trigger
  ON public.discharge_letter_templates;

CREATE TRIGGER enforce_discharge_template_format_trigger
BEFORE INSERT OR UPDATE OF title, discipline, content
ON public.discharge_letter_templates
FOR EACH ROW
EXECUTE FUNCTION public.enforce_discharge_template_format();

-- Normalize all existing templates immediately. The trigger keeps later edits,
-- imports and newly created rows in the same format.
UPDATE public.discharge_letter_templates
SET content = public.format_discharge_template_content(title, discipline, content);
