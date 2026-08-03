-- Add missing breast and gynaecological discharge-letter templates.
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
    'Borstkanker',
    'Tolaney (APT) — wekelijkse paclitaxel + trastuzumab (HER2+ borst)',
    E'Ter info: Tolaney (APT) — wekelijkse paclitaxel + trastuzumab (HER2+ borst)\n---\n\nAdjuvant regime voor geselecteerde patiënten met klein, kliernegatief HER2-positief borstcarcinoom. Paclitaxel 80 mg/m² IV wekelijks gedurende 12 weken, gecombineerd met trastuzumab (oplaaddosis 4 mg/kg, daarna 2 mg/kg wekelijks). Vervolgens trastuzumab als monotherapie om in totaal 1 jaar anti-HER2-behandeling te voltooien; een 3-wekelijks schema kan volgens lokaal protocol worden gebruikt. Baseline en periodieke LVEF-evaluatie zijn vereist.\n\n- Verwachte nevenwerkingen:\n\nPaclitaxel: perifere sensorische neuropathie, myalgie/arthralgie, alopecia, nagelveranderingen, myelosuppressie en infusiereacties. Trastuzumab: infusiereacties, vermoeidheid en asymptomatische LVEF-daling; symptomatisch hartfalen is zeldzaam maar belangrijk.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C of tekenen van infectie (urgent).\n\nNieuwe of toenemende neuropathie met functionele hinder.\n\nDyspnoe, orthopneu, thoracale pijn, snelle gewichtstoename of perifeer oedeem (mogelijke cardiotoxiciteit).\n\nAcute huiduitslag, bronchospasme, dyspnoe of hypotensie tijdens of kort na het infuus.\n\nErnstige mucositis, persisterend braken of onvoldoende orale intake.',
    11
  ),
  (
    'Gynaecologische tumoren',
    'topotecan — recidief ovarium- of cervixcarcinoom',
    E'Ter info: topotecan — recidief ovarium- of cervixcarcinoom\n---\n\nTopoisomerase-I-inhibitor bij gemetastaseerd ovariumcarcinoom na falen van eerdere therapie en, in combinatie met cisplatine, bij recidief of stadium IVB cervixcarcinoom. Monotherapie wordt typisch toegediend als 1.5 mg/m² IV gedurende 30 minuten op dag 1–5, elke 21 dagen. Bij cervixcarcinoom: topotecan 0.75 mg/m² IV op dag 1–3 met cisplatine op dag 1, elke 21 dagen. Dosis en uitstel worden aangepast aan bloedbeeld en nierfunctie.\n\n- Verwachte nevenwerkingen:\n\nErnstige neutropenie, anemie en trombocytopenie, nausea/braken, diarree of constipatie, mucositis, vermoeidheid, alopecia en infecties. Febriele neutropenie en sepsis zijn de belangrijkste acute risico''s. Zeldzaam: interstitiële longziekte.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C, rillingen of tekenen van infectie (febriele neutropenie — urgent).\n\nSpontane bloedingen, petechiën of uitgebreide hematomen.\n\nUitgesproken dyspnoe, bleekheid, duizeligheid of thoracale klachten (ernstige anemie).\n\nNieuwe droge hoest, hypoxie of progressieve dyspnoe (mogelijke interstitiële longziekte).\n\nPersisterend braken of diarree met dehydratie of onvoldoende intake.',
    45
  ),
  (
    'Gynaecologische tumoren',
    'paclitaxel (Taxol) wekelijks — gynaecologische tumoren',
    E'Ter info: paclitaxel (Taxol) wekelijks — gynaecologische tumoren\n---\n\nWekelijks paclitaxelregime, onder meer gebruikt bij recidief of platinum-resistent ovarium-, tuba- of primair peritoneaal carcinoom. Gebruikelijk schema: paclitaxel 80 mg/m² IV op dag 1, 8 en 15 van een cyclus van 28 dagen, met aanpassing volgens lokaal protocol en toxiciteit. Premedicatie is vereist ter preventie van hypersensitiviteitsreacties.\n\n- Verwachte nevenwerkingen:\n\nCumulatieve perifere sensorische neuropathie, myalgie/arthralgie, alopecia, nagelveranderingen, neutropenie en anemie, mucositis en vermoeidheid. Hypersensitiviteitsreacties kunnen vooral tijdens de eerste infusen optreden. Bradycardie en geleidingsstoornissen zijn zeldzaam.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts ≥ 38.5°C of tekenen van infectie (urgent).\n\nNieuwe of toenemende tintelingen, gevoelsverlies, pijn of motorische hinder.\n\nAcute huiduitslag, dyspnoe, bronchospasme of hypotensie tijdens of kort na het infuus.\n\nErnstige mucositis, persisterend braken of onvoldoende intake.\n\nNieuwe palpitaties, syncope, thoracale pijn of uitgesproken dyspnoe.',
    46
  ),
  (
    'Gynaecologische tumoren',
    'olaparib (Lynparza) — PARP-inhibitor bij gynaecologische tumoren',
    E'Ter info: olaparib (Lynparza) — PARP-inhibitor bij gynaecologische tumoren\n---\n\nOrale PARP-inhibitor, onder meer als onderhoudsbehandeling bij gevorderd hooggradig ovarium-, tuba- of primair peritoneaal carcinoom na respons op platinumtherapie, afhankelijk van BRCA1/2- en HRD-status en de specifieke indicatie. Gebruikelijke tabletdosis: 300 mg 2×/dag, met of zonder voedsel. Dosisreductie kan nodig zijn bij toxiciteit of nierfunctiestoornis. Vermijd sterke CYP3A-remmers en -inductoren.\n\n- Verwachte nevenwerkingen:\n\nNausea, vermoeidheid, anemie, neutropenie, trombocytopenie, verminderde eetlust, dyspepsie, diarree of constipatie, hoofdpijn en dysgeusie. Zeldzaam maar ernstig: pneumonitis en myelodysplastisch syndroom/acute myeloïde leukemie.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts of tekenen van infectie (urgent).\n\nUitgesproken vermoeidheid, bleekheid of inspanningsdyspnoe.\n\nSpontane bloedingen of uitgebreide hematomen.\n\nNieuwe droge hoest of progressieve dyspnoe.\n\nAanhoudende nausea/braken met onvoldoende intake.\n\nNieuwe of persisterende cytopenieën of macrocytose.',
    47
  ),
  (
    'Gynaecologische tumoren',
    'niraparib (Zejula) — PARP-inhibitor bij gynaecologische tumoren',
    E'Ter info: niraparib (Zejula) — PARP-inhibitor bij gynaecologische tumoren\n---\n\nOrale PARP-inhibitor als onderhoudsbehandeling bij geselecteerde patiënten met hooggradig ovarium-, tuba- of primair peritoneaal carcinoom na respons op platinumtherapie. Startdosis doorgaans 200 mg 1×/dag; 300 mg 1×/dag kan worden gebruikt bij lichaamsgewicht ≥ 77 kg én trombocyten ≥ 150 × 10⁹/L, volgens indicatie en lokaal protocol. Regelmatige controle van bloedbeeld, bloeddruk en hartfrequentie is vereist.\n\n- Verwachte nevenwerkingen:\n\nTrombocytopenie, anemie, neutropenie, nausea, constipatie, braken, buikpijn, vermoeidheid, hoofdpijn, slapeloosheid, hypertensie en palpitaties. Zeldzaam maar ernstig: hypertensieve crisis, PRES en myelodysplastisch syndroom/acute myeloïde leukemie.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts of tekenen van infectie (urgent).\n\nSpontane bloedingen, petechiën of uitgebreide hematomen.\n\nUitgesproken vermoeidheid, bleekheid of inspanningsdyspnoe.\n\nPersisterende bloeddruk ≥ 160/100 mmHg, ernstige hoofdpijn, visusstoornissen, verwardheid of convulsies.\n\nNieuwe palpitaties, syncope of thoracale pijn.\n\nNieuwe of persisterende cytopenieën of macrocytose.',
    48
  ),
  (
    'Gynaecologische tumoren',
    'rucaparib (Rubraca) — PARP-inhibitor bij gynaecologische tumoren',
    E'Ter info: rucaparib (Rubraca) — PARP-inhibitor bij gynaecologische tumoren\n---\n\nOrale PARP-inhibitor als onderhoudsbehandeling bij geselecteerde patiënten met hooggradig ovarium-, tuba- of primair peritoneaal carcinoom met complete of partiële respons na platinumchemotherapie. Gebruikelijke dosis: 600 mg 2×/dag, met of zonder voedsel. Dosisonderbreking of -reductie kan nodig zijn bij toxiciteit. Controleer bloedbeeld en leverfunctietesten vóór en tijdens de behandeling.\n\n- Verwachte nevenwerkingen:\n\nNausea, vermoeidheid, braken, anemie, trombocytopenie, neutropenie, buikpijn, dysgeusie, verminderde eetlust, diarree of constipatie, stijging van transaminasen en fotosensitiviteit. Zeldzaam maar ernstig: myelodysplastisch syndroom/acute myeloïde leukemie.\n\n- Indicaties tot verwijzing door de huisarts:\n\nContacteer de behandelend oncoloog bij:\n\nKoorts of tekenen van infectie (urgent).\n\nSpontane bloedingen, petechiën of uitgebreide hematomen.\n\nUitgesproken vermoeidheid, bleekheid of inspanningsdyspnoe.\n\nGeelzucht, donkere urine of pijn in de rechter bovenbuik.\n\nErnstige huidreactie na zonlicht; adviseer zonbescherming.\n\nNieuwe of persisterende cytopenieën of macrocytose.',
    49
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
