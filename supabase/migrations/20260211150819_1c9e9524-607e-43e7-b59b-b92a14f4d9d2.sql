-- Security definer function to check drug visibility based on hospital disciplines
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
    -- Platform drugs: check if any disease_area matches an enabled discipline
    (
      _drug_hospital_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.hospital_disciplines hd
        WHERE hd.hospital_id = get_user_hospital_id(auth.uid())
          AND hd.is_enabled = true
          AND hd.disease_area = ANY(_disease_areas)
      )
    )
$$;

-- Replace the existing SELECT policy on drugs
DROP POLICY IF EXISTS "Users see platform and hospital drugs" ON public.drugs;

CREATE POLICY "Users see platform and hospital drugs"
ON public.drugs
FOR SELECT
TO authenticated
USING (
  drug_visible_for_user(disease_areas, hospital_id)
);
