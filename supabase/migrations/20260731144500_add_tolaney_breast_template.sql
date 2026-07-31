-- Add the adjuvant Tolaney/APT regimen to every current discharge-letter document.
-- Existing manually maintained variants are preserved.
INSERT INTO public.discharge_letter_templates (
  document_id,
  hospital_id,
  discipline,
  title,
  content,
  display_order
)
SELECT
  document.id,
  document.hospital_id,
  'Borstkanker',
  'Tolaney-schema (paclitaxel + trastuzumab) — adjuvant',
  E'Ter info: Tolaney-schema (paclitaxel + trastuzumab) — adjuvant\n---\n\nPatiënte kreeg een adjuvante behandeling volgens het Tolaney/APT-schema voor HER2-positieve borstkanker: paclitaxel 80 mg/m² intraveneus eenmaal per week gedurende 12 weken, gecombineerd met trastuzumab. Na de paclitaxelfase wordt trastuzumab verdergezet tot een totale behandelduur van één jaar.\n\nVerwachte nevenwerkingen\n• Paclitaxel: vermoeidheid, misselijkheid, haarverlies, spier- of gewrichtspijn, perifere neuropathie, nagelveranderingen, beenmergsuppressie en overgevoeligheidsreacties.\n• Trastuzumab: infusiereacties en mogelijke vermindering van de linkerventrikelfunctie. Cardiale opvolging gebeurt volgens het lokale protocol.\n\nIndicaties tot verwijzing of dringende beoordeling\n• Koorts ≥ 38,0 °C of klinische tekenen van infectie.\n• Nieuwe of toenemende dyspneu, thoracale pijn, palpitaties, uitgesproken perifeer oedeem of snelle gewichtstoename.\n• Ernstige of progressieve neuropathie, belangrijke functievermindering of een ernstige overgevoeligheidsreactie.\n\nDe concrete dosering, toedieningsvorm van trastuzumab en opvolging worden afgestemd op het lokale behandelprotocol en de individuele patiënt.',
  COALESCE((
    SELECT MAX(existing.display_order) + 1
    FROM public.discharge_letter_templates AS existing
    WHERE existing.document_id = document.id
      AND existing.discipline = 'Borstkanker'
  ), 0)
FROM public.discharge_letter_documents AS document
WHERE NOT EXISTS (
  SELECT 1
  FROM public.discharge_letter_templates AS existing
  WHERE existing.document_id = document.id
    AND (existing.title ILIKE '%tolaney%' OR existing.content ILIKE '%tolaney%')
);
