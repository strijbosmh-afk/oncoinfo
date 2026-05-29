-- 1. Create dedicated billing table
CREATE TABLE public.hospital_billing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid NOT NULL UNIQUE,
  billing_name text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_postal_code text,
  billing_city text,
  billing_vat_number text,
  billing_email text,
  billing_phone text,
  billing_contact_person text,
  billing_peppol_id text,
  billing_peppol_scheme text DEFAULT '0208',
  billing_iban text,
  billing_bic text,
  billing_po_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Grants (super-admin only via RLS; service_role for edge functions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_billing TO authenticated;
GRANT ALL ON public.hospital_billing TO service_role;

-- 3. RLS: only platform admins
ALTER TABLE public.hospital_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage billing"
  ON public.hospital_billing
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Timestamp trigger
CREATE TRIGGER update_hospital_billing_updated_at
  BEFORE UPDATE ON public.hospital_billing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Migrate existing billing data
INSERT INTO public.hospital_billing (
  hospital_id, billing_name, billing_address_line1, billing_address_line2,
  billing_postal_code, billing_city, billing_vat_number, billing_email,
  billing_phone, billing_contact_person, billing_peppol_id, billing_peppol_scheme,
  billing_iban, billing_bic, billing_po_number
)
SELECT
  id, billing_name, billing_address_line1, billing_address_line2,
  billing_postal_code, billing_city, billing_vat_number, billing_email,
  billing_phone, billing_contact_person, billing_peppol_id, billing_peppol_scheme,
  billing_iban, billing_bic, billing_po_number
FROM public.hospitals
WHERE billing_name IS NOT NULL
   OR billing_iban IS NOT NULL
   OR billing_vat_number IS NOT NULL
   OR billing_email IS NOT NULL
   OR billing_address_line1 IS NOT NULL;

-- 6. Drop sensitive billing columns from hospitals (keep billing_country)
ALTER TABLE public.hospitals
  DROP COLUMN billing_name,
  DROP COLUMN billing_address_line1,
  DROP COLUMN billing_address_line2,
  DROP COLUMN billing_postal_code,
  DROP COLUMN billing_city,
  DROP COLUMN billing_vat_number,
  DROP COLUMN billing_email,
  DROP COLUMN billing_phone,
  DROP COLUMN billing_contact_person,
  DROP COLUMN billing_peppol_id,
  DROP COLUMN billing_peppol_scheme,
  DROP COLUMN billing_iban,
  DROP COLUMN billing_bic,
  DROP COLUMN billing_po_number;
