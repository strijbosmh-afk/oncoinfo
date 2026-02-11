-- Update the drug visibility function to work with category-based disciplines
-- Categories map to multiple disease_areas:
-- Borstkanker -> Borstkanker, breast
-- Urologie -> Prostaatkanker, Blaaskanker, Niercelcarcinoom, Testiskanker, Peniskanker
-- Gynaecologie -> Ovariumkanker, Ovariumcarcinoom, Endometriumkanker, Endometriumcarcinoom, Cervixkanker, Cervixcarcinoom, Vulvakanker, gynecology
-- Respiratoire oncologie -> Longkanker, NSCLC, SCLC, Mesothelioom
-- Supportive Care -> Supportive Care, Anti-emetica, Groeifactoren, Erytropoietines, Trombopoietine-agonisten, Antiresorptiva

CREATE OR REPLACE FUNCTION public.get_discipline_disease_areas(_discipline text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _discipline
    WHEN 'Borstkanker' THEN ARRAY['Borstkanker', 'breast']
    WHEN 'Urologie' THEN ARRAY['Prostaatkanker', 'Blaaskanker', 'Niercelcarcinoom', 'Testiskanker', 'Peniskanker']
    WHEN 'Gynaecologie' THEN ARRAY['Ovariumkanker', 'Ovariumcarcinoom', 'Endometriumkanker', 'Endometriumcarcinoom', 'Cervixkanker', 'Cervixcarcinoom', 'Vulvakanker', 'gynecology']
    WHEN 'Respiratoire oncologie' THEN ARRAY['Longkanker', 'NSCLC', 'SCLC', 'Mesothelioom']
    WHEN 'Supportive Care' THEN ARRAY['Supportive Care', 'Anti-emetica', 'Groeifactoren', 'Erytropoietines', 'Trombopoietine-agonisten', 'Antiresorptiva']
    ELSE ARRAY[_discipline]
  END
$$;

-- Update drug_visible_for_user to use category mapping
CREATE OR REPLACE FUNCTION public.drug_visible_for_user(_disease_areas text[], _drug_hospital_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Super admins see everything
    has_role(auth.uid(), 'super_admin'::app_role)
    OR
    -- Hospital-specific drugs visible to their hospital
    (_drug_hospital_id IS NOT NULL AND _drug_hospital_id = get_user_hospital_id(auth.uid()))
    OR
    -- Platform drugs: if hospital has NO disciplines configured, show all (backwards compatible)
    (
      _drug_hospital_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.hospital_disciplines hd
        WHERE hd.hospital_id = get_user_hospital_id(auth.uid())
      )
    )
    OR
    -- Platform drugs: check if any disease_area matches an enabled discipline category
    (
      _drug_hospital_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.hospital_disciplines hd
        WHERE hd.hospital_id = get_user_hospital_id(auth.uid())
          AND hd.is_enabled = true
          AND _disease_areas && get_discipline_disease_areas(hd.disease_area)
      )
    )
$$;

-- Clean up any old granular discipline entries and migrate to categories
DELETE FROM public.hospital_disciplines;
