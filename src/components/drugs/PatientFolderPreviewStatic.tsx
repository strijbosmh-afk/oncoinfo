interface Drug {
  generic_name: string;
  brand_names: string[];
  mechanism_of_action?: string | null;
  approved_indications?: string[] | null;
  dosing_info?: any;
  cycle_length_days?: number | null;
  side_effects?: any;
  contraindications?: string[] | null;
  patient_counseling_points?: string[] | null;
  monitoring_requirements?: string[] | null;
}

export function generateStaticPreviewHtml(
  drug: Drug,
  physicianName: string,
  nurseName: string,
  language: 'nl' | 'fr',
  phoneNumber: string,
  includeDosing: boolean,
  includeSideEffects: boolean,
): string {
  const isFr = language === 'fr';
  const brandNamesText = drug.brand_names?.length > 0 ? ` (${drug.brand_names.join(', ')})` : '';

  const labels = isFr ? {
    title: 'Information pour les patients',
    whatIs: `Qu'est-ce que ${drug.generic_name} ?`,
    usedFor: 'À quoi sert-il ?',
    howGiven: 'Comment est-il administré ?',
    whenNot: 'Quand ne pas utiliser',
    sideEffects: 'Effets secondaires possibles',
    commonSE: 'Fréquents',
    seriousSE: 'Graves - Contactez immédiatement votre médecin',
    selfCare: 'Ce que vous pouvez faire vous-même',
    tips: 'Conseils importants',
    monitoring: 'Contrôles',
    contact: 'Contact',
    physician: 'Médecin',
    nurse: 'Infirmier(ère)',
    phone: 'Tél',
    footer: `RZ Tienen - Oncologie | ${new Date().toLocaleDateString('fr-BE')} | Cette information complète l'entretien avec votre médecin.`,
    preview: 'APERÇU - La version finale contiendra des descriptions adaptées aux patients.',
  } : {
    title: 'Informatie voor patiënten',
    whatIs: `Wat is ${drug.generic_name}?`,
    usedFor: 'Waarvoor wordt het gebruikt?',
    howGiven: 'Hoe wordt het gegeven?',
    whenNot: 'Wanneer niet gebruiken',
    sideEffects: 'Mogelijke bijwerkingen',
    commonSE: 'Veel voorkomend',
    seriousSE: 'Ernstig - Neem direct contact op',
    selfCare: 'Wat kunt u zelf doen?',
    tips: 'Belangrijke tips',
    monitoring: 'Controles',
    contact: 'Contact',
    physician: 'Arts',
    nurse: 'Verpleegkundige',
    phone: 'Tel',
    footer: `RZ Tienen - Oncologie | ${new Date().toLocaleDateString('nl-NL')} | Deze informatie is bedoeld als aanvulling op het gesprek met uw arts.`,
    preview: 'VOORBEELD - De definitieve versie bevat patiëntvriendelijke beschrijvingen.',
  };

  const introText = drug.mechanism_of_action || '';
  const usageItems = drug.approved_indications?.slice(0, 4) || [];
  
  let dosingHtml = '';
  if (includeDosing && drug.dosing_info) {
    const parts: string[] = [];
    if (drug.dosing_info.frequency) parts.push(drug.dosing_info.frequency);
    if (drug.cycle_length_days) parts.push(`${isFr ? 'Cycle' : 'Cyclus'}: ${drug.cycle_length_days} ${isFr ? 'jours' : 'dagen'}`);
    if (drug.dosing_info.duration) parts.push(`${isFr ? 'Durée' : 'Duur'}: ${drug.dosing_info.duration}`);
    dosingHtml = parts.join('<br>');
  }

  const humanize = (term: string): string => {
    const map: Record<string, { nl: string; fr: string }> = {
      // Dutch terms (as stored in DB)
      'cardiotoxiciteit': { nl: 'Mogelijke belasting van het hart – uw arts volgt dit op via regelmatige controles', fr: 'Risque cardiaque possible – votre médecin surveille cela régulièrement' },
      'cardiotoxiciteit (her2-therapie)': { nl: 'Mogelijke belasting van het hart door de HER2-behandeling – wordt nauwkeurig gevolgd met echo\'s', fr: 'Risque cardiaque lié au traitement HER2 – suivi attentivement par échographies' },
      'febriele neutropenie': { nl: 'Koorts door verlaagde afweer – neem onmiddellijk contact op bij koorts boven 38°C', fr: 'Fièvre due à une baisse de l\'immunité – contactez immédiatement si fièvre supérieure à 38°C' },
      'neutropene koorts': { nl: 'Koorts door verlaagde afweer – neem onmiddellijk contact op bij koorts boven 38°C', fr: 'Fièvre due à une baisse de l\'immunité – contactez immédiatement si fièvre supérieure à 38°C' },
      'neutropenie': { nl: 'Verlaagde witte bloedcellen, waardoor u vatbaarder bent voor infecties', fr: 'Baisse des globules blancs, vous rendant plus sensible aux infections' },
      'ernstige neutropenie (graad 4)': { nl: 'Sterk verlaagde witte bloedcellen – wordt nauwlettend gecontroleerd via bloedonderzoek', fr: 'Baisse importante des globules blancs – suivi attentif par analyses sanguines' },
      'leukopenie': { nl: 'Verlaagde witte bloedcellen – wordt gecontroleerd via bloedonderzoek', fr: 'Baisse des globules blancs – contrôlée par analyses sanguines' },
      'anemie': { nl: 'Verlaagde rode bloedcellen, waardoor u zich moe of kortademig kunt voelen', fr: 'Baisse des globules rouges, pouvant causer fatigue ou essoufflement' },
      'trombocytopenie': { nl: 'Verlaagde bloedplaatjes – u kunt sneller blauwe plekken krijgen', fr: 'Baisse des plaquettes – vous pouvez avoir des bleus plus facilement' },
      'myelosuppressie': { nl: 'Tijdelijk verminderde aanmaak van bloedcellen – wordt gevolgd via bloedonderzoek', fr: 'Production temporairement réduite de cellules sanguines – suivie par analyses sanguines' },
      'ernstige myelosuppressie': { nl: 'Sterk verminderde aanmaak van bloedcellen – wordt nauwlettend gevolgd', fr: 'Production fortement réduite de cellules sanguines – suivi attentif' },
      'misselijkheid': { nl: 'Misselijkheid – er bestaan goede medicijnen om dit te verminderen', fr: 'Nausées – des médicaments efficaces existent pour les réduire' },
      'braken': { nl: 'Braken – meld dit aan uw arts, er zijn oplossingen', fr: 'Vomissements – signalez-le à votre médecin, des solutions existent' },
      'alopecia': { nl: 'Tijdelijk haarverlies – uw haar groeit na de behandeling weer aan', fr: 'Perte de cheveux temporaire – vos cheveux repousseront après le traitement' },
      'alopecia (mild)': { nl: 'Licht haarverlies – meestal beperkt en tijdelijk', fr: 'Légère perte de cheveux – généralement limitée et temporaire' },
      'vermoeidheid': { nl: 'Vermoeidheid – luister naar uw lichaam en rust voldoende', fr: 'Fatigue – écoutez votre corps et reposez-vous suffisamment' },
      'diarree': { nl: 'Diarree – drink voldoende en meld het als het aanhoudt', fr: 'Diarrhée – buvez suffisamment et signalez si cela persiste' },
      'diarree (pertuzumab)': { nl: 'Diarree (kan voorkomen bij pertuzumab) – drink voldoende en meld het als het aanhoudt', fr: 'Diarrhée (possible avec pertuzumab) – buvez suffisamment et signalez si cela persiste' },
      'ernstige diarree': { nl: 'Ernstige diarree – neem contact op als het niet stopt', fr: 'Diarrhée sévère – contactez si cela ne s\'arrête pas' },
      'stomatitis': { nl: 'Pijnlijke mondwondjes – goed mondspoelen helpt', fr: 'Aphtes douloureux – bien rincer la bouche aide' },
      'mucositis': { nl: 'Ontstekingen in de mond – goed mondspoelen helpt dit te voorkomen', fr: 'Inflammations buccales – bien rincer la bouche aide à les prévenir' },
      'neuropathie': { nl: 'Tintelingen of gevoelloosheid in handen/voeten – meld dit tijdig', fr: 'Picotements ou engourdissements dans les mains/pieds – signalez-le' },
      'perifere neuropathie': { nl: 'Tintelingen of gevoelloosheid in handen/voeten – meld dit tijdig aan uw arts', fr: 'Picotements ou engourdissements dans les mains/pieds – signalez-le à votre médecin' },
      'ernstige perifere neuropathie': { nl: 'Sterke tintelingen of gevoelloosheid in handen/voeten – meld dit onmiddellijk', fr: 'Picotements ou engourdissements importants – signalez immédiatement' },
      'ernstige neuropathie': { nl: 'Sterke tintelingen of gevoelloosheid – meld dit onmiddellijk', fr: 'Picotements ou engourdissements importants – signalez immédiatement' },
      'nagelveranderingen': { nl: 'Veranderingen aan de nagels – meestal tijdelijk', fr: 'Modifications des ongles – généralement temporaires' },
      'oedeem': { nl: 'Vochtophoping (zwelling) – meld het als het toeneemt', fr: 'Rétention d\'eau (gonflement) – signalez si cela augmente' },
      'obstipatie': { nl: 'Verstopping – voldoende drinken en vezelrijk eten helpt', fr: 'Constipation – boire suffisamment et manger des fibres aide' },
      'buikpijn': { nl: 'Buikpijn – meld het als het aanhoudt', fr: 'Douleurs abdominales – signalez si cela persiste' },
      'hoofdpijn': { nl: 'Hoofdpijn – meestal mild en tijdelijk', fr: 'Maux de tête – généralement légers et temporaires' },
      'huiduitslag': { nl: 'Huiduitslag – meld dit aan uw arts', fr: 'Éruption cutanée – signalez-le à votre médecin' },
      'hand-voetsyndroom': { nl: 'Roodheid of pijn aan handpalmen/voetzolen – goed insmeren helpt', fr: 'Rougeur ou douleur aux paumes/plantes – bien hydrater aide' },
      'hypersensitiviteit': { nl: 'Mogelijke overgevoeligheidsreactie – het team is hierop voorbereid', fr: 'Réaction d\'hypersensibilité possible – l\'équipe y est préparée' },
      'interstitiële longziekte': { nl: 'Zeldzame longontsteking – meld kortademigheid of aanhoudende hoest', fr: 'Inflammation pulmonaire rare – signalez essoufflement ou toux persistante' },
      'pneumonitis': { nl: 'Ontsteking van de longen – meld kortademigheid of aanhoudende hoest', fr: 'Inflammation des poumons – signalez essoufflement ou toux persistante' },
      'levertoxiciteit': { nl: 'Mogelijke belasting van de lever – wordt gevolgd via bloedonderzoek', fr: 'Risque hépatique possible – suivi par analyses sanguines' },
      'hepatitis': { nl: 'Leverontsteking – wordt gevolgd via bloedonderzoek', fr: 'Hépatite – suivie par analyses sanguines' },
      'nierinsufficiëntie': { nl: 'Mogelijke belasting van de nieren – wordt gevolgd via bloedonderzoek', fr: 'Risque rénal possible – suivi par analyses sanguines' },
      'nefritis': { nl: 'Nierontsteking – wordt gevolgd via bloedonderzoek', fr: 'Néphrite – suivie par analyses sanguines' },
      'veneuze trombo-embolie': { nl: 'Verhoogd risico op bloedstolsels – meld pijn/zwelling in benen of kortademigheid', fr: 'Risque accru de caillots sanguins – signalez douleur/gonflement des jambes ou essoufflement' },
      'longembolie': { nl: 'Bloedstolsel in de longen – meld onmiddellijk kortademigheid of pijn op de borst', fr: 'Caillot sanguin dans les poumons – signalez immédiatement essoufflement ou douleur thoracique' },
      'immuungerelateerde pneumonitis': { nl: 'Longontsteking door het immuunsysteem – meld kortademigheid of hoest', fr: 'Pneumonite liée au système immunitaire – signalez essoufflement ou toux' },
      'colitis': { nl: 'Darmontsteking – meld aanhoudende diarree of buikpijn', fr: 'Inflammation intestinale – signalez diarrhée persistante ou douleurs abdominales' },
      'endocrinopathieën': { nl: 'Verstoring van de hormoonhuishouding – wordt gevolgd via bloedonderzoek', fr: 'Perturbation hormonale – suivie par analyses sanguines' },
      'mds/aml': { nl: 'Zeer zeldzame bloedafwijking – wordt gevolgd via bloedonderzoek', fr: 'Anomalie sanguine très rare – suivie par analyses sanguines' },
      'myelodysplastisch syndroom': { nl: 'Zeer zeldzame bloedafwijking – wordt gevolgd via bloedonderzoek', fr: 'Anomalie sanguine très rare – suivie par analyses sanguines' },
      'acute leukemie': { nl: 'Zeer zeldzame bloedafwijking – wordt gevolgd via bloedonderzoek', fr: 'Anomalie sanguine très rare – suivie par analyses sanguines' },
      'bovenste luchtweginfecties': { nl: 'Luchtweginfecties (verkoudheid, keelpijn) – meld koorts', fr: 'Infections des voies respiratoires – signalez la fièvre' },
      'paralytische ileus': { nl: 'Ernstige darmstilstand – meld onmiddellijk aanhoudende buikpijn en braken', fr: 'Arrêt intestinal grave – signalez immédiatement douleurs abdominales persistantes et vomissements' },
      'fracturen': { nl: 'Verhoogd risico op botbreuken', fr: 'Risque accru de fractures' },
      // English terms (fallback)
      'cardiotoxicity': { nl: 'Mogelijke belasting van het hart – uw arts volgt dit op via regelmatige controles', fr: 'Risque cardiaque possible – votre médecin surveille cela régulièrement' },
      'febrile neutropenia': { nl: 'Koorts door verlaagde afweer – neem onmiddellijk contact op bij koorts boven 38°C', fr: 'Fièvre due à une baisse de l\'immunité – contactez immédiatement si fièvre supérieure à 38°C' },
      'neutropenia': { nl: 'Verlaagde witte bloedcellen, waardoor u vatbaarder bent voor infecties', fr: 'Baisse des globules blancs, vous rendant plus sensible aux infections' },
      'anemia': { nl: 'Verlaagde rode bloedcellen, waardoor u zich moe of kortademig kunt voelen', fr: 'Baisse des globules rouges, pouvant causer fatigue ou essoufflement' },
      'thrombocytopenia': { nl: 'Verlaagde bloedplaatjes – u kunt sneller blauwe plekken krijgen', fr: 'Baisse des plaquettes – vous pouvez avoir des bleus plus facilement' },
      'nausea': { nl: 'Misselijkheid – er bestaan goede medicijnen om dit te verminderen', fr: 'Nausées – des médicaments efficaces existent pour les réduire' },
      'vomiting': { nl: 'Braken – meld dit aan uw arts, er zijn oplossingen', fr: 'Vomissements – signalez-le à votre médecin, des solutions existent' },
      'fatigue': { nl: 'Vermoeidheid – luister naar uw lichaam en rust voldoende', fr: 'Fatigue – écoutez votre corps et reposez-vous suffisamment' },
      'diarrhea': { nl: 'Diarree – drink voldoende en meld het als het aanhoudt', fr: 'Diarrhée – buvez suffisamment et signalez si cela persiste' },
      'rash': { nl: 'Huiduitslag – meld dit aan uw arts', fr: 'Éruption cutanée – signalez-le à votre médecin' },
      'constipation': { nl: 'Verstopping – voldoende drinken en vezelrijk eten helpt', fr: 'Constipation – boire suffisamment et manger des fibres aide' },
      'hepatotoxicity': { nl: 'Mogelijke belasting van de lever – wordt gevolgd via bloedonderzoek', fr: 'Risque hépatique possible – suivi par analyses sanguines' },
      'nephrotoxicity': { nl: 'Mogelijke belasting van de nieren – wordt gevolgd via bloedonderzoek', fr: 'Risque rénal possible – suivi par analyses sanguines' },
      'hypertension': { nl: 'Verhoogde bloeddruk – wordt regelmatig gecontroleerd', fr: 'Hypertension artérielle – contrôlée régulièrement' },
      'hypothyroidism': { nl: 'Vertraagde werking van de schildklier – wordt gevolgd via bloedonderzoek', fr: 'Ralentissement de la thyroïde – suivi par analyses sanguines' },
    };
    // Strip percentages and parenthetical details for matching, e.g. "Neutropenie (80%)" -> "neutropenie"
    const cleaned = term.toLowerCase().trim();
    if (map[cleaned]) return isFr ? map[cleaned].fr : map[cleaned].nl;
    // Try without parenthetical suffix
    const withoutParens = cleaned.replace(/\s*\(.*?\)\s*$/, '').trim();
    if (withoutParens !== cleaned && map[withoutParens]) return isFr ? map[withoutParens].fr : map[withoutParens].nl;
    return term;
  };

  const commonSE = (drug.side_effects?.common?.slice(0, 5) || []).map(humanize);
  const seriousSE = (drug.side_effects?.serious?.slice(0, 3) || []).map(humanize);
  const contraItems = drug.contraindications?.slice(0, 4) || [];
  const tipItems = drug.patient_counseling_points?.slice(0, 4) || [];
  const monitorItems = drug.monitoring_requirements?.slice(0, 4) || [];

  const listHtml = (items: string[]) =>
    items.length > 0 ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '';

  return `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'nl'}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px; line-height: 1.5; color: #1a1a1a;
      padding: 10mm; background: white;
    }
    .preview-badge { background: #6b2d5b; color: white; text-align: center; padding: 6px; font-size: 11px; border-radius: 4px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .logo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #6b2d5b; }
    .logo-header img { max-height: 45px; width: auto; }
    .header-title { text-align: right; }
    .header-title h1 { color: #6b2d5b; font-size: 20px; margin-bottom: 2px; }
    .header-title .subtitle { color: #666; font-size: 12px; }
    .content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .section { margin-bottom: 8px; }
    .section h2 { color: #6b2d5b; font-size: 14px; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #e0e0e0; }
    .section p { margin-bottom: 4px; color: #333; font-size: 12px; }
    .section ul { margin-left: 14px; margin-bottom: 4px; }
    .section li { margin-bottom: 2px; color: #333; font-size: 12px; }
    .warning-box { background: #fff8e6; border-left: 3px solid #e87722; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
    .warning-box h3 { color: #cc7a00; font-size: 12px; margin-bottom: 3px; }
    .danger-box { background: #ffe6e6; border-left: 3px solid #cc0000; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
    .danger-box h3 { color: #cc0000; font-size: 12px; margin-bottom: 3px; }
    .selfcare-box { background: #e8f5e9; border-left: 3px solid #388e3c; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
    .selfcare-box h3 { color: #2e7d32; font-size: 12px; margin-bottom: 3px; }
    .info-box { background: #f5e6f0; border-left: 3px solid #6b2d5b; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
    .full-width { grid-column: 1 / -1; }
    .contact-section { background: #f5f5f5; padding: 8px 10px; border-radius: 4px; margin-top: 10px; font-size: 11px; }
    .contact-section h2 { font-size: 13px; margin-bottom: 6px; color: #6b2d5b; }
    .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="preview-badge">${labels.preview}</div>
  <div class="logo-header">
    <img src="/images/logo-rzt.png" alt="RZ Tienen Logo" />
    <div class="header-title">
      <h1>${drug.generic_name}${brandNamesText}</h1>
      <p class="subtitle">${labels.title}</p>
    </div>
  </div>

  <div class="content">
    ${introText ? `<div class="section"><h2>${labels.whatIs}</h2><p>${introText}</p></div>` : ''}
    ${usageItems.length > 0 ? `<div class="section"><h2>${labels.usedFor}</h2>${listHtml(usageItems)}</div>` : ''}
    ${includeDosing && dosingHtml ? `<div class="section"><h2>${labels.howGiven}</h2><p>${dosingHtml}</p></div>` : ''}
    ${contraItems.length > 0 ? `<div class="section"><h2>${labels.whenNot}</h2>${listHtml(contraItems)}</div>` : ''}

    ${includeSideEffects && (commonSE.length > 0 || seriousSE.length > 0) ? `
    <div class="section full-width">
      <h2>${labels.sideEffects}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${commonSE.length > 0 ? `<div class="warning-box"><h3>${labels.commonSE}</h3>${listHtml(commonSE)}</div>` : ''}
        ${seriousSE.length > 0 ? `<div class="danger-box"><h3>${labels.seriousSE}</h3>${listHtml(seriousSE)}</div>` : ''}
      </div>
    </div>` : ''}

    <div class="section full-width">
      <h2>${labels.selfCare}</h2>
      <div class="selfcare-box">
        <h3>${isFr ? 'Conseils pratiques' : 'Praktische tips'}</h3>
        <p style="font-size: 11px; color: #555; font-style: italic;">${isFr ? 'Des conseils personnalisés seront générés automatiquement.' : 'Gepersonaliseerde tips worden automatisch gegenereerd.'}</p>
      </div>
    </div>

    ${tipItems.length > 0 ? `<div class="section"><h2>${labels.tips}</h2><div class="info-box">${listHtml(tipItems)}</div></div>` : ''}
    ${monitorItems.length > 0 ? `<div class="section"><h2>${labels.monitoring}</h2>${listHtml(monitorItems)}</div>` : ''}
  </div>

  <div class="contact-section full-width">
    <h2>${labels.contact}</h2>
    <div class="contact-grid">
      <p><strong>${labels.physician}:</strong> ${physicianName || '_________________'}</p>
      <p><strong>${labels.nurse}:</strong> ${nurseName || '_________________'}</p>
      <p><strong>${labels.phone}:</strong> ${phoneNumber || '016 80 90 11'}</p>
    </div>
  </div>

  <div class="footer"><p>${labels.footer}</p></div>
</body>
</html>`;
}
