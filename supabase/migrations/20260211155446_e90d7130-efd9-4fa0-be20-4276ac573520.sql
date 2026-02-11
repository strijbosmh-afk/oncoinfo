
-- Add billing fields to hospitals for invoicing (incl. PEPPOL)
ALTER TABLE public.hospitals
  ADD COLUMN billing_name text,
  ADD COLUMN billing_address_line1 text,
  ADD COLUMN billing_address_line2 text,
  ADD COLUMN billing_postal_code text,
  ADD COLUMN billing_city text,
  ADD COLUMN billing_country text DEFAULT 'België',
  ADD COLUMN billing_vat_number text,
  ADD COLUMN billing_email text,
  ADD COLUMN billing_phone text,
  ADD COLUMN billing_contact_person text,
  ADD COLUMN billing_peppol_id text,
  ADD COLUMN billing_peppol_scheme text DEFAULT '0208',
  ADD COLUMN billing_iban text,
  ADD COLUMN billing_bic text,
  ADD COLUMN billing_po_number text;
