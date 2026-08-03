-- Add disease-specific cervical and endometrial cancer discharge-letter templates.
-- Reuse the current global source document and guard every title against duplicates.
WITH source_document AS (
  SELECT id
  FROM public.discharge_letter_documents
  WHERE hospital_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1
), templates(discipline, title, content, display_order) AS (
  VALUES
  (
    'Gynaecologische tumoren',
    'cisplatine wekelijks + radiotherapie - lokaal gevorderd cervixcarcinoom',
    E'Ter info: cisplatine wekelijks + radiotherapie - lokaal gevorderd cervixcarcinoom\n---\n\nConcomitante chemoradiotherapie met wekelijkse cisplatine bij lokaal gevorderd cervixcarcinoom. Cisplatine wordt doorgaans eenmaal per week tijdens de uitwendige radiotherapie toegediend, met dosis, aantal toedieningen en hydratatie volgens lokaal protocol. Controle van bloedbeeld, nierfunctie, magnesium en kalium is vereist.\n\n- Verwachte nevenwerkingen:\n\nNausea en braken, vermoeidheid, verminderde eetlust, beenmergsuppressie, nierfunctiestoornis, hypomagnesiëmie en hypokaliëmie, tinnitus of gehoorverlies en perifere neuropathie. Door de bekkenbestraling kunnen ook diarree, abdominale krampen, cystitis, frequente mictie en lokale huid- of slijmvliesreacties optreden.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C, rillingen of tekenen van infectie (urgent).\n\nPersisterend braken of diarree, onvoldoende intake, tekenen van dehydratie of duidelijk verminderde urineproductie.\n\nNieuwe tinnitus, gehoorverlies, tintelingen, gevoelsverlies of motorische hinder.\n\nErnstige dysurie, hematurie, rectaal bloedverlies of hevige abdominale of bekkenpijn.\n\nNieuwe palpitaties, spierzwakte, verwardheid of convulsies (mogelijke elektrolytenstoornis).',
    50
  ),
  (
    'Gynaecologische tumoren',
    'paclitaxel + platinum ± bevacizumab - recidief of gemetastaseerd cervixcarcinoom',
    E'Ter info: paclitaxel + platinum ± bevacizumab - recidief of gemetastaseerd cervixcarcinoom\n---\n\nSystemische behandeling bij persisterend, recidiverend of gemetastaseerd cervixcarcinoom. Paclitaxel wordt doorgaans elke 3 weken gecombineerd met cisplatine of carboplatine; bevacizumab kan bij geschikte patiënten worden toegevoegd. Middelkeuze, dosis en aantal cycli volgen het lokale protocol en houden rekening met eerdere platinumbehandeling, nierfunctie en contra-indicaties voor bevacizumab.\n\n- Verwachte nevenwerkingen:\n\nNeutropenie, anemie en trombocytopenie, nausea en braken, vermoeidheid, alopecia, myalgie, perifere neuropathie en hypersensitiviteitsreacties. Cisplatine kan nierfunctiestoornissen, elektrolytenverlies en gehoorschade veroorzaken. Bij bevacizumab: hypertensie, proteïnurie, bloedingen, trombo-embolie, gestoorde wondheling en zeldzaam gastro-intestinale of genito-urinaire fistel of perforatie.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C of tekenen van infectie (urgent).\n\nNieuwe of toenemende neuropathie, tinnitus of gehoorverlies.\n\nPersisterend braken, onvoldoende intake, dehydratie of verminderde urineproductie.\n\nPersisterende bloeddruk ≥ 160/100 mmHg, ernstige hoofdpijn, visusstoornissen of thoracale pijn.\n\nAcute dyspnoe, unilaterale beenzwelling, ernstige buik- of bekkenpijn, fors bloedverlies of passage van urine of stoelgang via de vagina (urgent).',
    51
  ),
  (
    'Gynaecologische tumoren',
    'carboplatine + paclitaxel - gevorderd of recidief endometriumcarcinoom',
    E'Ter info: carboplatine + paclitaxel - gevorderd of recidief endometriumcarcinoom\n---\n\nKlassiek chemotherapieschema bij primair gevorderd of recidiverend endometriumcarcinoom. Carboplatine en paclitaxel worden doorgaans om de 3 weken toegediend, meestal gedurende 6 cycli. Dosis, aantal cycli en eventuele aanpassingen worden bepaald volgens lokaal protocol, bloedbeeld, nierfunctie en toxiciteit.\n\n- Verwachte nevenwerkingen:\n\nNeutropenie, anemie en trombocytopenie, nausea en braken, vermoeidheid, alopecia, myalgie en arthralgie, perifere sensorische neuropathie en nagelveranderingen. Hypersensitiviteitsreacties kunnen tijdens het infuus optreden; carboplatine-allergie komt vaker voor na herhaalde blootstelling.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C, rillingen of tekenen van infectie (urgent).\n\nSpontane bloedingen, petechiën of uitgebreide hematomen.\n\nNieuwe of toenemende tintelingen, gevoelsverlies, pijn of motorische hinder.\n\nAcute huiduitslag, dyspnoe, bronchospasme of hypotensie tijdens of kort na het infuus.\n\nPersisterend braken of diarree, ernstige mucositis of onvoldoende intake.',
    52
  ),
  (
    'Gynaecologische tumoren',
    'carboplatine + paclitaxel + dostarlimab - gevorderd of recidief endometriumcarcinoom',
    E'Ter info: carboplatine + paclitaxel + dostarlimab - gevorderd of recidief endometriumcarcinoom\n---\n\nChemo-immunotherapie bij primair gevorderd of recidiverend endometriumcarcinoom. Dostarlimab wordt gecombineerd met carboplatine en paclitaxel gedurende de initiële cycli en daarna als onderhoud voortgezet, volgens indicatie, moleculair profiel en lokaal protocol. Controleer bloedbeeld, nier- en leverfunctie, schildklierfunctie en klinische tekenen van immuungemedieerde toxiciteit.\n\n- Verwachte nevenwerkingen:\n\nNaast beenmergsuppressie, nausea, vermoeidheid, alopecia, myalgie en perifere neuropathie door chemotherapie kunnen immuungemedieerde bijwerkingen optreden. Deze kunnen onder meer huid, darm, lever, longen, schildklier, hypofyse, bijnieren, nieren, zenuwstelsel of hart aantasten en ook na het stoppen van de behandeling ontstaan. Infuusreacties zijn mogelijk.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C of tekenen van infectie (urgent).\n\nNieuwe of progressieve dyspnoe, droge hoest, hypoxie of thoracale pijn.\n\nAanhoudende diarree, bloed of slijm bij de stoelgang, ernstige buikpijn of persisterend braken.\n\nGeelzucht, donkere urine, ernstige jeuk of pijn in de rechter bovenbuik.\n\nNieuwe ernstige hoofdpijn, visusstoornissen, verwardheid, uitgesproken zwakte, palpitaties of duidelijke verandering in dorst of urineproductie.\n\nUitgebreide huiduitslag, blaarvorming of slijmvliesletsels.',
    53
  )
)
INSERT INTO public.discharge_letter_templates (
  document_id,
  hospital_id,
  discipline,
  title,
  content,
  display_order
)
SELECT source_document.id, NULL, templates.discipline, templates.title, templates.content, templates.display_order
FROM source_document
CROSS JOIN templates
WHERE NOT EXISTS (
  SELECT 1
  FROM public.discharge_letter_templates existing
  WHERE lower(existing.title) = lower(templates.title)
    AND existing.hospital_id IS NULL
);
