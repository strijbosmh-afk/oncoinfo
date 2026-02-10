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
    if (drug.dosing_info.standard_dose) parts.push(`Dosering: ${drug.dosing_info.standard_dose}`);
    if (drug.dosing_info.frequency) parts.push(`Frequentie: ${drug.dosing_info.frequency}`);
    if (drug.dosing_info.duration) parts.push(`Duur: ${drug.dosing_info.duration}`);
    if (drug.cycle_length_days) parts.push(`Cyclus: ${drug.cycle_length_days} dagen`);
    dosingHtml = parts.join('<br>');
  }

  const commonSE = drug.side_effects?.common?.slice(0, 5) || [];
  const seriousSE = drug.side_effects?.serious?.slice(0, 3) || [];
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
