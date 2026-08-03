-- Add the adjuvant APT/Tolaney regimen as a platform-wide therapy card.
INSERT INTO public.drugs (
  generic_name,
  brand_names,
  drug_class,
  mechanism_of_action,
  disease_areas,
  approved_indications,
  common_regimens,
  dosing_info,
  administration_route,
  cycle_length_days,
  side_effects,
  contraindications,
  drug_interactions,
  monitoring_requirements,
  patient_counseling_points,
  reference_links,
  registration_trial,
  display_order,
  hospital_id
)
SELECT
  'Tolaney-schema (Paclitaxel + Trastuzumab)',
  ARRAY['APT-schema', 'Tolaney-regime', 'Taxol + Herceptin'],
  'Combinatietherapie',
  'Paclitaxel stabiliseert microtubuli en remt de celdeling. Trastuzumab blokkeert HER2-gemedieerde signaaltransductie en activeert immuungemedieerde tumorcelafbraak.',
  ARRAY['Borstkanker'],
  ARRAY[
    'Adjuvante behandeling van geselecteerde patiënten met kleine, kliernegatieve HER2-positieve invasieve borstkanker',
    'Vroeg stadium HER2-positieve borstkanker waarvoor een niet-antracyclinebevattend schema passend is volgens multidisciplinair besluit'
  ],
  ARRAY['Paclitaxel + trastuzumab wekelijks gedurende 12 weken, gevolgd door trastuzumab tot een totale duur van 1 jaar'],
  jsonb_build_object(
    'standard_dose', 'Paclitaxel 80 mg/m² IV eenmaal per week gedurende 12 weken, gelijktijdig met trastuzumab; daarna trastuzumab als monotherapie tot een totale behandelduur van 1 jaar',
    'frequency', 'Paclitaxel wekelijks gedurende 12 weken; trastuzumab wekelijks of elke 3 weken volgens product en lokaal protocol',
    'duration', '12 weken combinatietherapie, daarna trastuzumab tot in totaal 1 jaar',
    'induction', 'Paclitaxel 80 mg/m² IV wekelijks x12 + trastuzumab (IV of SC volgens lokaal protocol)',
    'maintenance', 'Trastuzumab monotherapie tot een totale behandelduur van 1 jaar',
    'notes', 'APT/Tolaney-schema. Selectie, trastuzumabformulering, dosisaanpassingen en onderbrekingscriteria volgen het lokale protocol.',
    'dose_adjustments', jsonb_build_array(
      jsonb_build_object('condition', 'Klinisch relevante perifere neuropathie', 'adjustment', 'Paclitaxel onderbreken of reduceren volgens graad en lokaal protocol'),
      jsonb_build_object('condition', 'Neutropenie of trombocytopenie', 'adjustment', 'Paclitaxel uitstellen en hervatten volgens herstelcriteria van het lokale protocol'),
      jsonb_build_object('condition', 'Klinisch relevante LVEF-daling of symptomen van hartfalen', 'adjustment', 'Trastuzumab onderbreken en cardiaal evalueren volgens productinformatie en lokaal protocol')
    )
  ),
  'Intraveneus en/of subcutaan',
  7,
  jsonb_build_object(
    'common', jsonb_build_array(
      'Vermoeidheid',
      'Alopecia',
      'Perifere sensorische neuropathie',
      'Myalgie en arthralgie',
      'Nagelveranderingen',
      'Neutropenie en anemie',
      'Misselijkheid',
      'Diarree',
      'Infusie- of injectiereacties'
    ),
    'serious', jsonb_build_array(
      'Febriele neutropenie of ernstige infectie',
      'Ernstige overgevoeligheidsreactie op paclitaxel',
      'Symptomatische linkerventrikeldisfunctie of hartfalen',
      'Ernstige of persisterende perifere neuropathie',
      'Interstitiële longziekte of pneumonitis (zeldzaam)'
    ),
    'management', jsonb_build_object(
      'neuropathie', 'Voor elke dosis actief bevragen; paclitaxel aanpassen volgens ernst en lokale richtlijn',
      'cardiotoxiciteit', 'LVEF vóór start en periodiek tijdens trastuzumab; bij klachten of relevante daling trastuzumab onderbreken en evalueren',
      'infusiereactie', 'Premedicatie voor paclitaxel volgens lokaal protocol en observatie tijdens toediening'
    )
  ),
  ARRAY[
    'Overgevoeligheid voor paclitaxel, trastuzumab of hulpstoffen',
    'Onvoldoende herstelde ernstige beenmergsuppressie voor paclitaxel',
    'Klinisch relevant hartfalen of ontoereikende linkerventrikelfunctie zonder voorafgaande cardiale beoordeling',
    'Zwangerschap; effectieve anticonceptie is vereist tijdens en na trastuzumab volgens productinformatie'
  ],
  ARRAY[
    'Sterke CYP2C8- of CYP3A4-remmers of -inductoren kunnen de blootstelling aan paclitaxel beïnvloeden',
    'Vermijd gelijktijdige cardiotoxische behandeling tenzij expliciet opgenomen in het oncologische protocol'
  ],
  ARRAY[
    'HER2-status en pathologisch stadium vóór behandelbesluit',
    'Volledig bloedbeeld vóór elke paclitaxeltoediening',
    'Leverfunctie tijdens de paclitaxelfase',
    'Perifere neuropathie vóór elke paclitaxeltoediening',
    'LVEF vóór start en doorgaans elke 3 maanden tijdens trastuzumab, volgens lokaal protocol',
    'Tekenen van infusiereactie, infectie, dyspnoe of hartfalen'
  ],
  ARRAY[
    'Meld koorts van 38 °C of hoger of tekenen van infectie onmiddellijk',
    'Meld nieuwe of toenemende tintelingen, gevoelsverlies, pijn of functionele hinder vroegtijdig',
    'Meld nieuwe dyspnoe, thoracale pijn, palpitaties, oedeem of snelle gewichtstoename onmiddellijk',
    'Premedicatie bij paclitaxel en regelmatige hartcontroles zijn onderdeel van het schema',
    'Trastuzumab wordt na de 12 wekelijkse paclitaxeldoses verdergezet tot een totale behandelduur van 1 jaar'
  ],
  ARRAY[
    'https://pubmed.ncbi.nlm.nih.gov/36858723/',
    'https://www.ema.europa.eu/en/medicines/human/EPAR/herceptin'
  ],
  'APT-trial (Tolaney et al.)',
  1053,
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.drugs existing
  WHERE existing.hospital_id IS NULL
    AND (
      lower(existing.generic_name) LIKE '%tolaney%'
      OR lower(existing.generic_name) LIKE '%apt-schema%'
    )
);
