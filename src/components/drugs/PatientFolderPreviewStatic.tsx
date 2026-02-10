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
      'cardiotoxicity': { nl: 'Mogelijke belasting van het hart – uw arts volgt dit op via regelmatige controles', fr: 'Risque cardiaque possible – votre médecin surveille cela régulièrement' },
      'febrile neutropenia': { nl: 'Verhoogd risico op infecties met koorts door verlaagde witte bloedcellen – neem onmiddellijk contact op bij koorts boven 38°C', fr: 'Risque accru d\'infections avec fièvre dû à une baisse des globules blancs – contactez immédiatement en cas de fièvre supérieure à 38°C' },
      'neutropenia': { nl: 'Verlaagde witte bloedcellen, waardoor u vatbaarder bent voor infecties', fr: 'Baisse des globules blancs, vous rendant plus sensible aux infections' },
      'anemia': { nl: 'Verlaagde rode bloedcellen, waardoor u zich moe of kortademig kunt voelen', fr: 'Baisse des globules rouges, pouvant causer fatigue ou essoufflement' },
      'thrombocytopenia': { nl: 'Verlaagde bloedplaatjes, waardoor u sneller blauwe plekken of bloedingen kunt krijgen', fr: 'Baisse des plaquettes, pouvant causer des bleus ou saignements plus facilement' },
      'nausea': { nl: 'Misselijkheid – er bestaan goede medicijnen om dit te verminderen', fr: 'Nausées – des médicaments efficaces existent pour les réduire' },
      'vomiting': { nl: 'Braken – meld dit aan uw arts, er zijn oplossingen', fr: 'Vomissements – signalez-le à votre médecin, des solutions existent' },
      'alopecia': { nl: 'Tijdelijk haarverlies – uw haar groeit na de behandeling weer aan', fr: 'Perte de cheveux temporaire – vos cheveux repousseront après le traitement' },
      'fatigue': { nl: 'Vermoeidheid – luister naar uw lichaam en rust voldoende', fr: 'Fatigue – écoutez votre corps et reposez-vous suffisamment' },
      'diarrhea': { nl: 'Diarree – drink voldoende en meld het als het aanhoudt', fr: 'Diarrhée – buvez suffisamment et signalez si cela persiste' },
      'mucositis': { nl: 'Ontstekingen in de mond – goed mondspoelen helpt dit te voorkomen', fr: 'Inflammations buccales – bien rincer la bouche aide à les prévenir' },
      'stomatitis': { nl: 'Pijnlijke mondwondjes – uw arts kan een mondverzorgingsadvies geven', fr: 'Aphtes douloureux – votre médecin peut conseiller des soins buccaux' },
      'peripheral neuropathy': { nl: 'Tintelingen of gevoelloosheid in handen/voeten – meld dit tijdig aan uw arts', fr: 'Picotements ou engourdissements dans les mains/pieds – signalez-le à votre médecin' },
      'neuropathy': { nl: 'Tintelingen of gevoelloosheid in handen/voeten', fr: 'Picotements ou engourdissements dans les mains/pieds' },
      'hand-foot syndrome': { nl: 'Roodheid of pijn aan handpalmen/voetzolen – goed insmeren helpt', fr: 'Rougeur ou douleur aux paumes/plantes – bien hydrater aide' },
      'rash': { nl: 'Huiduitslag – meld dit aan uw arts', fr: 'Éruption cutanée – signalez-le à votre médecin' },
      'constipation': { nl: 'Verstopping – voldoende drinken en vezelrijk eten helpt', fr: 'Constipation – boire suffisamment et manger des fibres aide' },
      'hepatotoxicity': { nl: 'Mogelijke belasting van de lever – wordt gevolgd via bloedonderzoek', fr: 'Risque hépatique possible – suivi par analyses sanguines' },
      'nephrotoxicity': { nl: 'Mogelijke belasting van de nieren – wordt gevolgd via bloedonderzoek', fr: 'Risque rénal possible – suivi par analyses sanguines' },
      'infusion reactions': { nl: 'Mogelijke reactie tijdens het infuus (koorts, rillingen) – het team is hierop voorbereid', fr: 'Réaction possible pendant la perfusion (fièvre, frissons) – l\'équipe y est préparée' },
      'hypertension': { nl: 'Verhoogde bloeddruk – wordt regelmatig gecontroleerd', fr: 'Hypertension artérielle – contrôlée régulièrement' },
      'hypothyroidism': { nl: 'Vertraagde werking van de schildklier – wordt gevolgd via bloedonderzoek', fr: 'Ralentissement de la thyroïde – suivi par analyses sanguines' },
      'pneumonitis': { nl: 'Ontsteking van de longen – meld kortademigheid of aanhoudende hoest', fr: 'Inflammation des poumons – signalez essoufflement ou toux persistante' },
    };
    const key = term.toLowerCase().trim();
    if (map[key]) return isFr ? map[key].fr : map[key].nl;
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
