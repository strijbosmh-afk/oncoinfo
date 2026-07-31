WITH respiratory_templates(title, content, sort_order) AS (
  VALUES
    (
      'Durvalumab (PACIFIC) - consolidatie bij niet-resectabel stadium III NSCLC',
      E'Ter info: Durvalumab (PACIFIC) - consolidatie bij niet-resectabel stadium III NSCLC\n--------------------------------------\nPatiënt kreeg consolidatiebehandeling met durvalumab na platinumbevattende chemoradiotherapie voor niet-resectabel stadium III niet-kleincellig longcarcinoom zonder ziekteprogressie.\n\nVerwachte nevenwerkingen\n- Vermoeidheid, hoest, dyspneu, huiduitslag, jeuk, diarree en verminderde eetlust.\n- Immuungerelateerde ontstekingen kunnen onder meer longen, darm, lever, schildklier, hypofyse, nieren, huid, hart of zenuwstelsel treffen.\n\nIndicaties doorverwijzing\n- Nieuwe of toenemende dyspneu, droge hoest, thoracale pijn of dalende zuurstofsaturatie.\n- Aanhoudende diarree, ernstige buikpijn, icterus, donkere urine of uitgesproken vermoeidheid.\n- Koorts, ernstige huidreactie, spierzwakte, neurologische klachten of symptomen van endocriene ontregeling.',
      10
    ),
    (
      'Pembrolizumab monotherapie - gevorderd NSCLC volgens biomarkerselectie',
      E'Ter info: Pembrolizumab monotherapie - gevorderd NSCLC volgens biomarkerselectie\n--------------------------------------\nPatiënt kreeg pembrolizumab als systemische behandeling voor gevorderd niet-kleincellig longcarcinoom na selectie volgens de geldende biomarker- en behandelingscriteria.\n\nVerwachte nevenwerkingen\n- Vermoeidheid, verminderde eetlust, nausea, diarree, huiduitslag, jeuk, hoest en gewrichtspijn.\n- Immuungerelateerde ontstekingen kunnen onder meer longen, darm, lever, endocriene organen, nieren, huid, hart of zenuwstelsel treffen.\n\nIndicaties doorverwijzing\n- Nieuwe of toenemende dyspneu, droge hoest, thoracale pijn of dalende zuurstofsaturatie.\n- Aanhoudende diarree, ernstige buikpijn, icterus, donkere urine of ernstige huidafwijkingen.\n- Koorts, uitgesproken spierzwakte, neurologische klachten of symptomen van endocriene ontregeling.',
      20
    ),
    (
      'Pembrolizumab + pemetrexed + platinum - 1e lijn niet-plaveiselcel NSCLC',
      E'Ter info: Pembrolizumab + pemetrexed + platinum - 1e lijn niet-plaveiselcel NSCLC\n--------------------------------------\nPatiënt kreeg pembrolizumab gecombineerd met pemetrexed en carboplatine of cisplatine als eerstelijnsbehandeling voor gevorderd niet-plaveiselcellig NSCLC, volgens het individuele behandelplan.\n\nVerwachte nevenwerkingen\n- Vermoeidheid, nausea, braken, verminderde eetlust, mucositis, huiduitslag, cytopenieën en infectierisico.\n- Nierfunctiestoornissen, perifere neuropathie en immuungerelateerde ontstekingen kunnen voorkomen.\n\nIndicaties doorverwijzing\n- Koorts ≥ 38,0 °C, tekenen van infectie, bloedingen of uitgesproken algemene achteruitgang.\n- Nieuwe of toenemende dyspneu, droge hoest, thoracale pijn of dalende zuurstofsaturatie.\n- Aanhoudend braken of diarree, dehydratie, sterk verminderde diurese, icterus of ernstige huidreactie.',
      30
    ),
    (
      'Pembrolizumab + carboplatine + paclitaxel - 1e lijn plaveiselcel NSCLC',
      E'Ter info: Pembrolizumab + carboplatine + paclitaxel - 1e lijn plaveiselcel NSCLC\n--------------------------------------\nPatiënt kreeg pembrolizumab gecombineerd met carboplatine en paclitaxel of nab-paclitaxel als eerstelijnsbehandeling voor gevorderd plaveiselcellig NSCLC, volgens het individuele behandelplan.\n\nVerwachte nevenwerkingen\n- Vermoeidheid, nausea, haarverlies, spier- of gewrichtspijn, perifere neuropathie, cytopenieën en infectierisico.\n- Overgevoeligheidsreacties en immuungerelateerde ontstekingen kunnen voorkomen.\n\nIndicaties doorverwijzing\n- Koorts ≥ 38,0 °C, tekenen van infectie, bloedingen of ernstige overgevoeligheidsreactie.\n- Nieuwe of toenemende dyspneu, droge hoest, thoracale pijn of dalende zuurstofsaturatie.\n- Ernstige of progressieve neuropathie, aanhoudende diarree, icterus of ernstige huidreactie.',
      40
    ),
    (
      'Atezolizumab + carboplatine + etoposide - 1e lijn extensive-stage SCLC',
      E'Ter info: Atezolizumab + carboplatine + etoposide - 1e lijn extensive-stage SCLC\n--------------------------------------\nPatiënt kreeg atezolizumab gecombineerd met carboplatine en etoposide als eerstelijnsbehandeling voor extensive-stage kleincellig longcarcinoom, gevolgd door onderhoud volgens het behandelplan.\n\nVerwachte nevenwerkingen\n- Vermoeidheid, nausea, braken, haarverlies, cytopenieën, infectierisico en perifere neuropathie.\n- Immuungerelateerde ontstekingen van onder meer longen, darm, lever, endocriene organen, nieren of huid kunnen voorkomen.\n\nIndicaties doorverwijzing\n- Koorts ≥ 38,0 °C, tekenen van infectie, bloedingen of uitgesproken algemene achteruitgang.\n- Nieuwe of toenemende dyspneu, droge hoest, thoracale pijn of dalende zuurstofsaturatie.\n- Aanhoudende diarree, icterus, donkere urine, ernstige huidreactie of symptomen van endocriene ontregeling.',
      50
    ),
    (
      'Nivolumab + ipilimumab - 1e lijn niet-resectabel pleuraal mesothelioom',
      E'Ter info: Nivolumab + ipilimumab - 1e lijn niet-resectabel pleuraal mesothelioom\n--------------------------------------\nPatiënt kreeg nivolumab gecombineerd met ipilimumab als eerstelijnsbehandeling voor niet-resectabel maligne pleuraal mesothelioom, volgens het individuele behandelplan.\n\nVerwachte nevenwerkingen\n- Vermoeidheid, huiduitslag, jeuk, diarree, nausea, verminderde eetlust, hoest, dyspneu en spier- of gewrichtspijn.\n- Immuungerelateerde ontstekingen kunnen meerdere organen treffen en kunnen vertraagd optreden.\n\nIndicaties doorverwijzing\n- Nieuwe of toenemende dyspneu, droge hoest, thoracale pijn of dalende zuurstofsaturatie.\n- Aanhoudende diarree, ernstige buikpijn, icterus, donkere urine of ernstige huidreactie.\n- Koorts, uitgesproken spierzwakte, neurologische klachten of symptomen van endocriene ontregeling.',
      60
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
SELECT
  document.id,
  document.hospital_id,
  'Respiratoire oncologie',
  template.title,
  template.content,
  COALESCE((
    SELECT MAX(existing.display_order)
    FROM public.discharge_letter_templates AS existing
    WHERE existing.document_id = document.id
      AND existing.discipline = 'Respiratoire oncologie'
  ), 0) + template.sort_order
FROM public.discharge_letter_documents AS document
CROSS JOIN respiratory_templates AS template
WHERE NOT EXISTS (
  SELECT 1
  FROM public.discharge_letter_templates AS existing
  WHERE existing.document_id = document.id
    AND lower(existing.title) = lower(template.title)
);
