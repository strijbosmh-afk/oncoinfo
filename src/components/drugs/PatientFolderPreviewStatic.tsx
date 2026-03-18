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
  common_regimens?: string[] | null;
  administration_route?: string | null;
}

export function generateStaticPreviewHtml(
  drug: Drug,
  physicianName: string,
  nurseName: string,
  language: string,
  phoneNumber: string,
  includeDosing: boolean,
  includeSideEffects: boolean,
  folderMode: 'compact' | 'uitgebreid' = 'compact',
  hospitalName: string = 'OncoInfo',
  hospitalLogoUrl: string | null = null,
  hospitalColor: string = '#6b2d5b',
  premedicatieItems: string[] = [],
  fontSize: number = 14,
  physicianPhone: string = '',
  nursePhone: string = '',
): string {
  const isFr = language === 'fr';
  const isEn = language === 'en';
  const isDe = language === 'de';
  const brandNamesText = drug.brand_names?.length > 0 ? ` (${drug.brand_names.join(', ')})` : '';

  const labelsByLang: Record<string, any> = {
    fr: {
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
      premedicatie: 'Médicaments de soutien',
      contact: 'Contact',
      physician: 'Médecin',
      nurse: 'Infirmier(ère)',
      phone: 'Tél',
      footer: `${hospitalName} - Oncologie | ${new Date().toLocaleDateString('fr-BE')} | Cette information complète l'entretien avec votre médecin.`,
      preview: `APERÇU - La version finale contiendra des descriptions adaptées aux patients. <strong>Le document final sera généré en français.</strong>`,
    },
    en: {
      title: 'Patient Information',
      whatIs: `What is ${drug.generic_name}?`,
      usedFor: 'What is it used for?',
      howGiven: 'How is it given?',
      whenNot: 'When not to use',
      sideEffects: 'Possible side effects',
      commonSE: 'Common',
      seriousSE: 'Serious - Contact your doctor immediately',
      selfCare: 'What you can do yourself',
      tips: 'Important tips',
      monitoring: 'Check-ups',
      premedicatie: 'Supportive medication',
      contact: 'Contact',
      physician: 'Physician',
      nurse: 'Nurse',
      phone: 'Phone',
      footer: `${hospitalName} - Oncology | ${new Date().toLocaleDateString('en-GB')} | This information is intended to complement the conversation with your doctor.`,
      preview: `PREVIEW - The final version will contain patient-friendly descriptions. <strong>The final document will be generated in English.</strong>`,
    },
    de: {
      title: 'Patienteninformation',
      whatIs: `Was ist ${drug.generic_name}?`,
      usedFor: 'Wofür wird es verwendet?',
      howGiven: 'Wie wird es verabreicht?',
      whenNot: 'Wann nicht verwenden',
      sideEffects: 'Mögliche Nebenwirkungen',
      commonSE: 'Häufig',
      seriousSE: 'Schwerwiegend - Kontaktieren Sie sofort Ihren Arzt',
      selfCare: 'Was Sie selbst tun können',
      tips: 'Wichtige Hinweise',
      monitoring: 'Kontrolluntersuchungen',
      premedicatie: 'Begleitmedikation',
      contact: 'Kontakt',
      physician: 'Arzt',
      nurse: 'Pflegekraft',
      phone: 'Tel',
      footer: `${hospitalName} - Onkologie | ${new Date().toLocaleDateString('de-DE')} | Diese Information ergänzt das Gespräch mit Ihrem Arzt.`,
      preview: `VORSCHAU - Die endgültige Version enthält patientenfreundliche Beschreibungen. <strong>Das endgültige Dokument wird auf Deutsch erstellt.</strong>`,
    },
    nl: {
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
      premedicatie: 'Ondersteunende medicatie',
      contact: 'Contact',
      physician: 'Arts',
      nurse: 'Verpleegkundige',
      phone: 'Tel',
      footer: `${hospitalName} - Oncologie | ${new Date().toLocaleDateString('nl-NL')} | Deze informatie is bedoeld als aanvulling op het gesprek met uw arts.`,
      preview: `VOORBEELD - De definitieve versie bevat patiëntvriendelijke beschrijvingen. <strong>De definitieve folder wordt gegenereerd in het Nederlands.</strong>`,
    },
  };

  const labels = labelsByLang[language] || labelsByLang['nl'];
  const introText = drug.mechanism_of_action || '';
  const usageItems = drug.approved_indications || [];
  
  let dosingItems: string[] = [];
  if (includeDosing) {
    const di = drug.dosing_info;
    if (di) {
      // Multi-phase schemas
      if (di.neoadjuvant_phase1) dosingItems.push(`${di.neoadjuvant_phase1}${di.neoadjuvant_phase1_duration ? ` (${di.neoadjuvant_phase1_duration})` : ''}`);
      if (di.neoadjuvant_phase2) dosingItems.push(`${di.neoadjuvant_phase2}${di.neoadjuvant_phase2_duration ? ` (${di.neoadjuvant_phase2_duration})` : ''}`);
      if (di.adjuvant) dosingItems.push(`${di.adjuvant}${di.adjuvant_duration ? ` (${di.adjuvant_duration})` : ''}`);
      // Simple schemas
      if (dosingItems.length === 0) {
        if (di.standard_dose) {
          dosingItems.push(di.standard_dose);
          // Only add frequency if not already included in standard_dose
          if (di.frequency && !di.standard_dose.toLowerCase().includes(di.frequency.toLowerCase().substring(0, 10))) {
            dosingItems.push(di.frequency);
          }
        } else {
          if (di.frequency) dosingItems.push(di.frequency);
          if (drug.cycle_length_days) {
            const cycleLabel = isEn ? 'Cycle' : isDe ? 'Zyklus' : isFr ? 'Cycle' : 'Cyclus';
            const daysLabel = isEn ? 'days' : isDe ? 'Tage' : isFr ? 'jours' : 'dagen';
            dosingItems.push(`${cycleLabel}: ${drug.cycle_length_days} ${daysLabel}`);
          }
        }
        if (di.duration) {
          const durLabel = isEn ? 'Duration' : isDe ? 'Dauer' : isFr ? 'Durée' : 'Duur';
          dosingItems.push(`${durLabel}: ${di.duration}`);
        }
      }
      if (di.notes) dosingItems.push(di.notes);
    }
    // Fallback to common_regimens
    if (dosingItems.length === 0 && drug.common_regimens?.length > 0) {
      dosingItems = [...(drug.common_regimens || [])];
    }
    // Add instruction to always follow physician's instructions for oral medications (as first item, bold)
    if (drug.administration_route?.toLowerCase() === 'oraal') {
      const followInstructions: Record<string, string> = {
        nl: '<strong>Volg altijd de instructies van uw behandelend arts.</strong>',
        fr: '<strong>Suivez toujours les instructions de votre médecin traitant.</strong>',
        de: '<strong>Befolgen Sie immer die Anweisungen Ihres behandelnden Arztes.</strong>',
        en: '<strong>Always follow your treating physician\'s instructions.</strong>',
      };
      dosingItems.unshift(followInstructions[language] || followInstructions['nl']);
    }
  }

  const humanize = (term: string): string => {
    const map: Record<string, { nl: string; fr: string; en?: string; de?: string }> = {
      // Dutch terms (as stored in DB)
      'cardiotoxiciteit': { nl: 'Mogelijke belasting van het hart – uw arts volgt dit op via regelmatige controles', fr: 'Risque cardiaque possible – votre médecin surveille cela régulièrement', en: 'Possible cardiac effects – your doctor will monitor this with regular check-ups', de: 'Mögliche Herzbelastung – Ihr Arzt überwacht dies mit regelmäßigen Kontrollen' },
      'cardiotoxiciteit (her2-therapie)': { nl: 'Mogelijke belasting van het hart door de HER2-behandeling – wordt nauwkeurig gevolgd met echo\'s', fr: 'Risque cardiaque lié au traitement HER2 – suivi attentivement par échographies', en: 'Possible cardiac effects from HER2 treatment – closely monitored with ultrasounds', de: 'Mögliche Herzbelastung durch HER2-Behandlung – wird sorgfältig mit Ultraschall überwacht' },
      'febriele neutropenie': { nl: 'Koorts door verlaagde afweer – neem onmiddellijk contact op bij koorts boven 38°C', fr: 'Fièvre due à une baisse de l\'immunité – contactez immédiatement si fièvre supérieure à 38°C', en: 'Fever due to lowered immunity – contact immediately if fever above 38°C', de: 'Fieber durch geschwächte Abwehr – kontaktieren Sie sofort bei Fieber über 38°C' },
      'neutropene koorts': { nl: 'Koorts door verlaagde afweer – neem onmiddellijk contact op bij koorts boven 38°C', fr: 'Fièvre due à une baisse de l\'immunité – contactez immédiatement si fièvre supérieure à 38°C', en: 'Fever due to lowered immunity – contact immediately if fever above 38°C', de: 'Fieber durch geschwächte Abwehr – kontaktieren Sie sofort bei Fieber über 38°C' },
      'neutropenie': { nl: 'Verlaagde witte bloedcellen, waardoor u vatbaarder bent voor infecties', fr: 'Baisse des globules blancs, vous rendant plus sensible aux infections', en: 'Low white blood cells, making you more susceptible to infections', de: 'Erniedrigte weiße Blutkörperchen, wodurch Sie anfälliger für Infektionen sind' },
      'ernstige neutropenie (graad 4)': { nl: 'Sterk verlaagde witte bloedcellen – wordt nauwlettend gecontroleerd via bloedonderzoek', fr: 'Baisse importante des globules blancs – suivi attentif par analyses sanguines', en: 'Severely low white blood cells – closely monitored through blood tests', de: 'Stark erniedrigte weiße Blutkörperchen – wird engmaschig durch Blutuntersuchungen kontrolliert' },
      'leukopenie': { nl: 'Verlaagde witte bloedcellen – wordt gecontroleerd via bloedonderzoek', fr: 'Baisse des globules blancs – contrôlée par analyses sanguines', en: 'Low white blood cells – monitored through blood tests', de: 'Erniedrigte weiße Blutkörperchen – wird durch Blutuntersuchungen kontrolliert' },
      'anemie': { nl: 'Verlaagde rode bloedcellen, waardoor u zich moe of kortademig kunt voelen', fr: 'Baisse des globules rouges, pouvant causer fatigue ou essoufflement', en: 'Low red blood cells, which may cause tiredness or shortness of breath', de: 'Erniedrigte rote Blutkörperchen, was zu Müdigkeit oder Kurzatmigkeit führen kann' },
      'trombocytopenie': { nl: 'Verlaagde bloedplaatjes – u kunt sneller blauwe plekken krijgen', fr: 'Baisse des plaquettes – vous pouvez avoir des bleus plus facilement', en: 'Low platelets – you may bruise more easily', de: 'Erniedrigte Blutplättchen – Sie können leichter blaue Flecken bekommen' },
      'myelosuppressie': { nl: 'Tijdelijk verminderde aanmaak van bloedcellen – wordt gevolgd via bloedonderzoek', fr: 'Production temporairement réduite de cellules sanguines – suivie par analyses sanguines', en: 'Temporary reduced blood cell production – monitored through blood tests', de: 'Vorübergehend verminderte Blutzellenproduktion – wird durch Blutuntersuchungen überwacht' },
      'ernstige myelosuppressie': { nl: 'Sterk verminderde aanmaak van bloedcellen – wordt nauwlettend gevolgd', fr: 'Production fortement réduite de cellules sanguines – suivi attentif', en: 'Severely reduced blood cell production – closely monitored', de: 'Stark verminderte Blutzellenproduktion – wird engmaschig überwacht' },
      'misselijkheid': { nl: 'Misselijkheid – er bestaan goede medicijnen om dit te verminderen', fr: 'Nausées – des médicaments efficaces existent pour les réduire', en: 'Nausea – effective medications are available to reduce this', de: 'Übelkeit – es gibt wirksame Medikamente dagegen' },
      'braken': { nl: 'Braken – meld dit aan uw arts, er zijn oplossingen', fr: 'Vomissements – signalez-le à votre médecin, des solutions existent', en: 'Vomiting – report this to your doctor, solutions are available', de: 'Erbrechen – melden Sie dies Ihrem Arzt, es gibt Lösungen' },
      'alopecia': { nl: 'Tijdelijk haarverlies – uw haar groeit na de behandeling weer aan', fr: 'Perte de cheveux temporaire – vos cheveux repousseront après le traitement', en: 'Temporary hair loss – your hair will grow back after treatment', de: 'Vorübergehender Haarausfall – Ihre Haare wachsen nach der Behandlung wieder nach' },
      'alopecia (mild)': { nl: 'Licht haarverlies – meestal beperkt en tijdelijk', fr: 'Légère perte de cheveux – généralement limitée et temporaire', en: 'Mild hair loss – usually limited and temporary', de: 'Leichter Haarausfall – meist begrenzt und vorübergehend' },
      'vermoeidheid': { nl: 'Vermoeidheid – luister naar uw lichaam en rust voldoende', fr: 'Fatigue – écoutez votre corps et reposez-vous suffisamment', en: 'Fatigue – listen to your body and rest enough', de: 'Müdigkeit – hören Sie auf Ihren Körper und ruhen Sie sich ausreichend aus' },
      'diarree': { nl: 'Diarree – drink voldoende en meld het als het aanhoudt', fr: 'Diarrhée – buvez suffisamment et signalez si cela persiste', en: 'Diarrhea – drink enough fluids and report if it persists', de: 'Durchfall – trinken Sie ausreichend und melden Sie es, wenn es anhält' },
      'diarree (pertuzumab)': { nl: 'Diarree (kan voorkomen bij pertuzumab) – drink voldoende en meld het als het aanhoudt', fr: 'Diarrhée (possible avec pertuzumab) – buvez suffisamment et signalez si cela persiste', en: 'Diarrhea (may occur with pertuzumab) – drink enough and report if persistent', de: 'Durchfall (kann bei Pertuzumab auftreten) – ausreichend trinken und bei Anhalten melden' },
      'ernstige diarree': { nl: 'Ernstige diarree – neem contact op als het niet stopt', fr: 'Diarrhée sévère – contactez si cela ne s\'arrête pas', en: 'Severe diarrhea – contact your doctor if it doesn\'t stop', de: 'Schwerer Durchfall – kontaktieren Sie Ihren Arzt, wenn er nicht aufhört' },
      'stomatitis': { nl: 'Pijnlijke mondwondjes – goed mondspoelen helpt', fr: 'Aphtes douloureux – bien rincer la bouche aide', en: 'Painful mouth sores – rinsing your mouth well helps', de: 'Schmerzhafte Mundgeschwüre – gründliches Mundspülen hilft' },
      'mucositis': { nl: 'Ontstekingen in de mond – goed mondspoelen helpt dit te voorkomen', fr: 'Inflammations buccales – bien rincer la bouche aide à les prévenir', en: 'Mouth inflammation – rinsing your mouth well helps prevent this', de: 'Entzündungen im Mund – gründliches Mundspülen hilft vorzubeugen' },
      'neuropathie': { nl: 'Tintelingen of gevoelloosheid in handen/voeten – meld dit tijdig', fr: 'Picotements ou engourdissements dans les mains/pieds – signalez-le', en: 'Tingling or numbness in hands/feet – report this promptly', de: 'Kribbeln oder Taubheit in Händen/Füßen – melden Sie dies rechtzeitig' },
      'perifere neuropathie': { nl: 'Tintelingen of gevoelloosheid in handen/voeten – meld dit tijdig aan uw arts', fr: 'Picotements ou engourdissements dans les mains/pieds – signalez-le à votre médecin', en: 'Tingling or numbness in hands/feet – report to your doctor promptly', de: 'Kribbeln oder Taubheit in Händen/Füßen – melden Sie dies rechtzeitig Ihrem Arzt' },
      'ernstige perifere neuropathie': { nl: 'Sterke tintelingen of gevoelloosheid in handen/voeten – meld dit onmiddellijk', fr: 'Picotements ou engourdissements importants – signalez immédiatement', en: 'Severe tingling or numbness in hands/feet – report immediately', de: 'Starkes Kribbeln oder Taubheit in Händen/Füßen – sofort melden' },
      'ernstige neuropathie': { nl: 'Sterke tintelingen of gevoelloosheid – meld dit onmiddellijk', fr: 'Picotements ou engourdissements importants – signalez immédiatement', en: 'Severe tingling or numbness – report immediately', de: 'Starkes Kribbeln oder Taubheit – sofort melden' },
      'nagelveranderingen': { nl: 'Veranderingen aan de nagels – meestal tijdelijk', fr: 'Modifications des ongles – généralement temporaires', en: 'Nail changes – usually temporary', de: 'Nagelveränderungen – meist vorübergehend' },
      'oedeem': { nl: 'Vochtophoping (zwelling) – meld het als het toeneemt', fr: 'Rétention d\'eau (gonflement) – signalez si cela augmente', en: 'Fluid retention (swelling) – report if it increases', de: 'Wassereinlagerungen (Schwellung) – melden, wenn es zunimmt' },
      'obstipatie': { nl: 'Verstopping – voldoende drinken en vezelrijk eten helpt', fr: 'Constipation – boire suffisamment et manger des fibres aide', en: 'Constipation – drinking enough fluids and eating fiber-rich food helps', de: 'Verstopfung – ausreichend trinken und ballaststoffreiche Ernährung helfen' },
      'buikpijn': { nl: 'Buikpijn – meld het als het aanhoudt', fr: 'Douleurs abdominales – signalez si cela persiste', en: 'Abdominal pain – report if it persists', de: 'Bauchschmerzen – melden, wenn sie anhalten' },
      'hoofdpijn': { nl: 'Hoofdpijn – meestal mild en tijdelijk', fr: 'Maux de tête – généralement légers et temporaires', en: 'Headache – usually mild and temporary', de: 'Kopfschmerzen – meist leicht und vorübergehend' },
      'huiduitslag': { nl: 'Huiduitslag – meld dit aan uw arts', fr: 'Éruption cutanée – signalez-le à votre médecin', en: 'Skin rash – report this to your doctor', de: 'Hautausschlag – melden Sie dies Ihrem Arzt' },
      'hand-voetsyndroom': { nl: 'Roodheid of pijn aan handpalmen/voetzolen – goed insmeren helpt', fr: 'Rougeur ou douleur aux paumes/plantes – bien hydrater aide', en: 'Redness or pain on palms/soles – moisturizing well helps', de: 'Rötung oder Schmerzen an Handflächen/Fußsohlen – gutes Eincremen hilft' },
      'hypersensitiviteit': { nl: 'Mogelijke overgevoeligheidsreactie – het team is hierop voorbereid', fr: 'Réaction d\'hypersensibilité possible – l\'équipe y est préparée', en: 'Possible hypersensitivity reaction – the team is prepared for this', de: 'Mögliche Überempfindlichkeitsreaktion – das Team ist darauf vorbereitet' },
      'interstitiële longziekte': { nl: 'Zeldzame longontsteking – meld kortademigheid of aanhoudende hoest', fr: 'Inflammation pulmonaire rare – signalez essoufflement ou toux persistante', en: 'Rare lung inflammation – report shortness of breath or persistent cough', de: 'Seltene Lungenentzündung – melden Sie Atemnot oder anhaltenden Husten' },
      'pneumonitis': { nl: 'Ontsteking van de longen – meld kortademigheid of aanhoudende hoest', fr: 'Inflammation des poumons – signalez essoufflement ou toux persistante', en: 'Lung inflammation – report shortness of breath or persistent cough', de: 'Lungenentzündung – melden Sie Atemnot oder anhaltenden Husten' },
      'levertoxiciteit': { nl: 'Mogelijke belasting van de lever – wordt gevolgd via bloedonderzoek', fr: 'Risque hépatique possible – suivi par analyses sanguines', en: 'Possible liver effects – monitored through blood tests', de: 'Mögliche Leberbelastung – wird durch Blutuntersuchungen überwacht' },
      'hepatitis': { nl: 'Leverontsteking – wordt gevolgd via bloedonderzoek', fr: 'Hépatite – suivie par analyses sanguines', en: 'Liver inflammation – monitored through blood tests', de: 'Leberentzündung – wird durch Blutuntersuchungen überwacht' },
      'nierinsufficiëntie': { nl: 'Mogelijke belasting van de nieren – wordt gevolgd via bloedonderzoek', fr: 'Risque rénal possible – suivi par analyses sanguines', en: 'Possible kidney effects – monitored through blood tests', de: 'Mögliche Nierenbelastung – wird durch Blutuntersuchungen überwacht' },
      'nefritis': { nl: 'Nierontsteking – wordt gevolgd via bloedonderzoek', fr: 'Néphrite – suivie par analyses sanguines', en: 'Kidney inflammation – monitored through blood tests', de: 'Nierenentzündung – wird durch Blutuntersuchungen überwacht' },
      'veneuze trombo-embolie': { nl: 'Verhoogd risico op bloedstolsels – meld pijn/zwelling in benen of kortademigheid', fr: 'Risque accru de caillots sanguins – signalez douleur/gonflement des jambes ou essoufflement', en: 'Increased risk of blood clots – report pain/swelling in legs or shortness of breath', de: 'Erhöhtes Risiko für Blutgerinnsel – melden Sie Schmerzen/Schwellungen in den Beinen oder Atemnot' },
      'longembolie': { nl: 'Bloedstolsel in de longen – meld onmiddellijk kortademigheid of pijn op de borst', fr: 'Caillot sanguin dans les poumons – signalez immédiatement essoufflement ou douleur thoracique', en: 'Blood clot in the lungs – report shortness of breath or chest pain immediately', de: 'Blutgerinnsel in der Lunge – melden Sie sofort Atemnot oder Brustschmerzen' },
      'immuungerelateerde pneumonitis': { nl: 'Longontsteking door het immuunsysteem – meld kortademigheid of hoest', fr: 'Pneumonite liée au système immunitaire – signalez essoufflement ou toux', en: 'Immune-related lung inflammation – report shortness of breath or cough', de: 'Immunbedingte Lungenentzündung – melden Sie Atemnot oder Husten' },
      'colitis': { nl: 'Darmontsteking – meld aanhoudende diarree of buikpijn', fr: 'Inflammation intestinale – signalez diarrhée persistante ou douleurs abdominales', en: 'Intestinal inflammation – report persistent diarrhea or abdominal pain', de: 'Darmentzündung – melden Sie anhaltenden Durchfall oder Bauchschmerzen' },
      'endocrinopathieën': { nl: 'Verstoring van de hormoonhuishouding – wordt gevolgd via bloedonderzoek', fr: 'Perturbation hormonale – suivie par analyses sanguines', en: 'Hormonal disruption – monitored through blood tests', de: 'Hormonstörung – wird durch Blutuntersuchungen überwacht' },
      'mds/aml': { nl: 'Zeer zeldzame bloedafwijking – wordt gevolgd via bloedonderzoek', fr: 'Anomalie sanguine très rare – suivie par analyses sanguines', en: 'Very rare blood disorder – monitored through blood tests', de: 'Sehr seltene Bluterkrankung – wird durch Blutuntersuchungen überwacht' },
      'myelodysplastisch syndroom': { nl: 'Zeer zeldzame bloedafwijking – wordt gevolgd via bloedonderzoek', fr: 'Anomalie sanguine très rare – suivie par analyses sanguines', en: 'Very rare blood disorder – monitored through blood tests', de: 'Sehr seltene Bluterkrankung – wird durch Blutuntersuchungen überwacht' },
      'acute leukemie': { nl: 'Zeer zeldzame bloedafwijking – wordt gevolgd via bloedonderzoek', fr: 'Anomalie sanguine très rare – suivie par analyses sanguines', en: 'Very rare blood disorder – monitored through blood tests', de: 'Sehr seltene Bluterkrankung – wird durch Blutuntersuchungen überwacht' },
      'bovenste luchtweginfecties': { nl: 'Luchtweginfecties (verkoudheid, keelpijn) – meld koorts', fr: 'Infections des voies respiratoires – signalez la fièvre', en: 'Upper respiratory infections (cold, sore throat) – report fever', de: 'Atemwegsinfektionen (Erkältung, Halsschmerzen) – melden Sie Fieber' },
      'paralytische ileus': { nl: 'Ernstige darmstilstand – meld onmiddellijk aanhoudende buikpijn en braken', fr: 'Arrêt intestinal grave – signalez immédiatement douleurs abdominales persistantes et vomissements', en: 'Severe bowel obstruction – report persistent abdominal pain and vomiting immediately', de: 'Schwerer Darmstillstand – melden Sie sofort anhaltende Bauchschmerzen und Erbrechen' },
      'fracturen': { nl: 'Verhoogd risico op botbreuken', fr: 'Risque accru de fractures', en: 'Increased risk of bone fractures', de: 'Erhöhtes Risiko für Knochenbrüche' },
      'erectiele dysfunctie': { nl: 'Problemen met de erectie – bespreek dit met uw arts, er zijn oplossingen', fr: 'Troubles de l\'érection – parlez-en à votre médecin, des solutions existent', en: 'Erectile problems – discuss with your doctor, solutions are available', de: 'Erektionsprobleme – besprechen Sie dies mit Ihrem Arzt, es gibt Lösungen' },
      'urine-incontinentie': { nl: 'Ongewild urineverlies – er bestaan oefeningen en hulpmiddelen die helpen', fr: 'Perte involontaire d\'urine – des exercices et des aides existent', en: 'Involuntary urine loss – exercises and aids are available', de: 'Unwillkürlicher Urinverlust – es gibt Übungen und Hilfsmittel' },
      'hematurie': { nl: 'Bloed in de urine – meld dit aan uw arts', fr: 'Sang dans les urines – signalez-le à votre médecin', en: 'Blood in urine – report to your doctor', de: 'Blut im Urin – melden Sie dies Ihrem Arzt' },
      'urineretentie': { nl: 'Moeilijk plassen of niet kunnen plassen – neem contact op met uw arts', fr: 'Difficultés à uriner – contactez votre médecin', en: 'Difficulty urinating – contact your doctor', de: 'Schwierigkeiten beim Wasserlassen – kontaktieren Sie Ihren Arzt' },
      'urineweginfectie': { nl: 'Blaasontsteking – meld pijn bij het plassen of koorts', fr: 'Infection urinaire – signalez douleur en urinant ou fièvre', en: 'Urinary tract infection – report pain when urinating or fever', de: 'Harnwegsinfektion – melden Sie Schmerzen beim Wasserlassen oder Fieber' },
      'cystitis': { nl: 'Blaasontsteking – meld pijn bij het plassen of koorts', fr: 'Cystite – signalez douleur en urinant ou fièvre', en: 'Bladder inflammation – report pain when urinating or fever', de: 'Blasenentzündung – melden Sie Schmerzen beim Wasserlassen oder Fieber' },
      'opvliegers': { nl: 'Opvliegers (warmte-aanvallen) – een bekend gevolg van de hormoonbehandeling', fr: 'Bouffées de chaleur – effet connu du traitement hormonal', en: 'Hot flashes – a known effect of hormonal treatment', de: 'Hitzewallungen – eine bekannte Wirkung der Hormonbehandlung' },
      'hot flashes': { nl: 'Opvliegers (warmte-aanvallen) – een bekend gevolg van de hormoonbehandeling', fr: 'Bouffées de chaleur – effet connu du traitement hormonal', en: 'Hot flashes – a known effect of hormonal treatment', de: 'Hitzewallungen – eine bekannte Wirkung der Hormonbehandlung' },
      'gynaecomastie': { nl: 'Zwelling van het borstweefsel – meld het als het last geeft', fr: 'Gonflement du tissu mammaire – signalez si cela vous gêne', en: 'Breast tissue swelling – report if bothersome', de: 'Schwellung des Brustgewebes – melden, wenn es stört' },
      'botpijn': { nl: 'Pijn in de botten – meld het als het aanhoudt, pijnstilling is mogelijk', fr: 'Douleur osseuse – signalez si cela persiste, un traitement antidouleur est possible', en: 'Bone pain – report if persistent, pain relief is available', de: 'Knochenschmerzen – melden, wenn anhaltend, Schmerzlinderung ist möglich' },
      'gewrichtspijn': { nl: 'Pijn in de gewrichten – meld het, er is pijnstilling mogelijk', fr: 'Douleur articulaire – signalez-le, un traitement antidouleur est possible', en: 'Joint pain – report it, pain relief is available', de: 'Gelenkschmerzen – melden Sie es, Schmerzlinderung ist möglich' },
      'artralgie': { nl: 'Pijn in de gewrichten – meld het aan uw arts', fr: 'Douleur articulaire – signalez-le à votre médecin', en: 'Joint pain – report to your doctor', de: 'Gelenkschmerzen – melden Sie es Ihrem Arzt' },
      'myalgie': { nl: 'Spierpijn – meestal tijdelijk, meld het als het aanhoudt', fr: 'Douleur musculaire – généralement temporaire, signalez si cela persiste', en: 'Muscle pain – usually temporary, report if persistent', de: 'Muskelschmerzen – meist vorübergehend, melden wenn anhaltend' },
      'proteïnurie': { nl: 'Eiwit in de urine – wordt gevolgd via urineonderzoek', fr: 'Protéines dans les urines – suivi par analyse d\'urine', en: 'Protein in urine – monitored through urine tests', de: 'Eiweiß im Urin – wird durch Urinuntersuchungen überwacht' },
      'hyperglykemie': { nl: 'Verhoogde bloedsuiker – wordt gevolgd via bloedonderzoek', fr: 'Glycémie élevée – suivie par analyses sanguines', en: 'High blood sugar – monitored through blood tests', de: 'Erhöhter Blutzucker – wird durch Blutuntersuchungen überwacht' },
      'hypokaliëmie': { nl: 'Verlaagd kalium in het bloed – wordt gevolgd via bloedonderzoek', fr: 'Potassium bas dans le sang – suivi par analyses sanguines', en: 'Low potassium in blood – monitored through blood tests', de: 'Erniedrigtes Kalium im Blut – wird durch Blutuntersuchungen überwacht' },
      'hyponatriëmie': { nl: 'Verlaagd natrium in het bloed – wordt gevolgd via bloedonderzoek', fr: 'Sodium bas dans le sang – suivi par analyses sanguines', en: 'Low sodium in blood – monitored through blood tests', de: 'Erniedrigtes Natrium im Blut – wird durch Blutuntersuchungen überwacht' },
      'libidoverlies': { nl: 'Verminderd seksueel verlangen – een bekend gevolg van de behandeling, bespreek het', fr: 'Diminution du désir sexuel – effet connu du traitement, parlez-en', en: 'Decreased sexual desire – a known effect of treatment, discuss it', de: 'Vermindertes sexuelles Verlangen – bekannte Wirkung der Behandlung, sprechen Sie darüber' },
      'verminderd libido': { nl: 'Verminderd seksueel verlangen – een bekend gevolg van de behandeling, bespreek het', fr: 'Diminution du désir sexuel – effet connu du traitement, parlez-en', en: 'Decreased sexual desire – a known effect of treatment, discuss it', de: 'Vermindertes sexuelles Verlangen – bekannte Wirkung der Behandlung, sprechen Sie darüber' },
      'nierfunctiestoornissen': { nl: 'Verminderde nierwerking – wordt gevolgd via bloedonderzoek', fr: 'Diminution de la fonction rénale – suivie par analyses sanguines', en: 'Reduced kidney function – monitored through blood tests', de: 'Eingeschränkte Nierenfunktion – wird durch Blutuntersuchungen überwacht' },
      'droge mond': { nl: 'Droge mond – drink regelmatig kleine slokjes water', fr: 'Bouche sèche – buvez régulièrement de petites gorgées d\'eau', en: 'Dry mouth – drink small sips of water regularly', de: 'Trockener Mund – trinken Sie regelmäßig kleine Schlucke Wasser' },
      'xerostomie': { nl: 'Droge mond – drink regelmatig kleine slokjes water', fr: 'Bouche sèche – buvez régulièrement de petites gorgées d\'eau', en: 'Dry mouth – drink small sips of water regularly', de: 'Trockener Mund – trinken Sie regelmäßig kleine Schlucke Wasser' },
      'schildklierafwijkingen': { nl: 'Verandering in de schildklierfunctie – wordt gevolgd via bloedonderzoek', fr: 'Modification de la fonction thyroïdienne – suivie par analyses sanguines', en: 'Thyroid function changes – monitored through blood tests', de: 'Veränderung der Schilddrüsenfunktion – wird durch Blutuntersuchungen überwacht' },
      'hypothyreoïdie': { nl: 'Vertraagde werking van de schildklier – wordt gevolgd via bloedonderzoek', fr: 'Ralentissement de la thyroïde – suivi par analyses sanguines', en: 'Underactive thyroid – monitored through blood tests', de: 'Schilddrüsenunterfunktion – wird durch Blutuntersuchungen überwacht' },
      'hyperthyreoïdie': { nl: 'Versnelde werking van de schildklier – wordt gevolgd via bloedonderzoek', fr: 'Accélération de la thyroïde – suivie par analyses sanguines', en: 'Overactive thyroid – monitored through blood tests', de: 'Schilddrüsenüberfunktion – wird durch Blutuntersuchungen überwacht' },
      'ototoxiciteit': { nl: 'Mogelijke gehoorschade – meld oorsuizen of gehoorverlies', fr: 'Risque auditif – signalez acouphènes ou perte d\'audition', en: 'Possible hearing damage – report ringing in ears or hearing loss', de: 'Mögliche Gehörschäden – melden Sie Ohrgeräusche oder Hörverlust' },
      'tinnitus': { nl: 'Oorsuizen – meld dit aan uw arts', fr: 'Acouphènes – signalez-le à votre médecin', en: 'Ringing in ears – report to your doctor', de: 'Ohrgeräusche – melden Sie dies Ihrem Arzt' },
      'vaginale bloeding': { nl: 'Bloedverlies uit de vagina – meld dit aan uw arts', fr: 'Saignement vaginal – signalez-le à votre médecin', en: 'Vaginal bleeding – report to your doctor', de: 'Vaginale Blutung – melden Sie dies Ihrem Arzt' },
      'vaginale droogheid': { nl: 'Droogheid in de vagina – bespreek dit met uw arts, er zijn oplossingen', fr: 'Sécheresse vaginale – parlez-en à votre médecin, des solutions existent', en: 'Vaginal dryness – discuss with your doctor, solutions are available', de: 'Vaginale Trockenheit – besprechen Sie dies mit Ihrem Arzt, es gibt Lösungen' },
      'amenorroe': { nl: 'Uitblijven van de menstruatie – een verwacht gevolg van de behandeling', fr: 'Absence de règles – effet attendu du traitement', en: 'Absence of menstruation – an expected effect of treatment', de: 'Ausbleiben der Menstruation – eine erwartete Wirkung der Behandlung' },
      'menopausale klachten': { nl: 'Klachten door overgang (opvliegers, nachtzweten) – meld het als het lastig is', fr: 'Symptômes ménopausiques (bouffées de chaleur, sueurs nocturnes) – signalez si gênant', en: 'Menopausal symptoms (hot flashes, night sweats) – report if bothersome', de: 'Wechseljahresbeschwerden (Hitzewallungen, Nachtschweiß) – melden, wenn störend' },
      'nachtzweten': { nl: 'Nachtzweten – een bekend gevolg van de hormoonbehandeling', fr: 'Sueurs nocturnes – effet connu du traitement hormonal', en: 'Night sweats – a known effect of hormonal treatment', de: 'Nachtschweiß – eine bekannte Wirkung der Hormonbehandlung' },
      'osteoporose': { nl: 'Botontkalking – uw arts volgt dit op en kan botbescherming voorschrijven', fr: 'Ostéoporose – votre médecin surveille et peut prescrire une protection osseuse', en: 'Bone loss – your doctor will monitor and may prescribe bone protection', de: 'Knochenschwund – Ihr Arzt überwacht dies und kann Knochenschutz verschreiben' },
      'ovariumfalen': { nl: 'Verminderde werking van de eierstokken – een gevolg van de behandeling', fr: 'Insuffisance ovarienne – conséquence du traitement', en: 'Ovarian failure – a consequence of treatment', de: 'Eierstockversagen – eine Folge der Behandlung' },
      'fertiliteitsrisico': { nl: 'Mogelijke invloed op de vruchtbaarheid – bespreek dit vóór de start van de behandeling', fr: 'Risque possible sur la fertilité – discutez-en avant de commencer le traitement', en: 'Possible effect on fertility – discuss before starting treatment', de: 'Mögliche Auswirkung auf die Fruchtbarkeit – besprechen Sie dies vor Beginn der Behandlung' },
      'infertiliteit': { nl: 'Mogelijke invloed op de vruchtbaarheid – bespreek dit vóór de start', fr: 'Risque possible sur la fertilité – discutez-en avant de commencer', en: 'Possible effect on fertility – discuss before starting', de: 'Mögliche Auswirkung auf die Fruchtbarkeit – besprechen Sie dies vor Beginn' },
      'ascites': { nl: 'Vochtophoping in de buik – meld toenemende buikomvang of ongemak', fr: 'Accumulation de liquide dans l\'abdomen – signalez augmentation du volume abdominal', en: 'Fluid build-up in abdomen – report increasing abdominal size or discomfort', de: 'Flüssigkeitsansammlung im Bauch – melden Sie zunehmenden Bauchumfang oder Beschwerden' },
      'ileus': { nl: 'Darmstilstand – meld onmiddellijk aanhoudende buikpijn, opgeblazen gevoel of braken', fr: 'Arrêt intestinal – signalez immédiatement douleurs abdominales, ballonnements ou vomissements', en: 'Bowel obstruction – report persistent abdominal pain, bloating or vomiting immediately', de: 'Darmstillstand – melden Sie sofort anhaltende Bauchschmerzen, Blähungen oder Erbrechen' },
      'darmobstructie': { nl: 'Verstopping van de darm – meld onmiddellijk buikpijn en braken', fr: 'Obstruction intestinale – signalez immédiatement douleurs abdominales et vomissements', en: 'Bowel obstruction – report abdominal pain and vomiting immediately', de: 'Darmverschluss – melden Sie sofort Bauchschmerzen und Erbrechen' },
      'fistel': { nl: 'Abnormale verbinding tussen organen – meld ongewone afscheiding of pijn', fr: 'Communication anormale entre organes – signalez écoulement inhabituel ou douleur', en: 'Abnormal connection between organs – report unusual discharge or pain', de: 'Abnormale Verbindung zwischen Organen – melden Sie ungewöhnlichen Ausfluss oder Schmerzen' },
      'wondgenezingsstoornissen': { nl: 'Tragere wondgenezing – meld het als wonden niet goed genezen', fr: 'Cicatrisation retardée – signalez si les plaies ne guérissent pas bien', en: 'Delayed wound healing – report if wounds don\'t heal well', de: 'Verzögerte Wundheilung – melden, wenn Wunden nicht gut heilen' },
      'bloedingen': { nl: 'Verhoogd risico op bloedingen – meld ongewoon bloedverlies', fr: 'Risque accru de saignements – signalez tout saignement inhabituel', en: 'Increased risk of bleeding – report unusual blood loss', de: 'Erhöhtes Blutungsrisiko – melden Sie ungewöhnlichen Blutverlust' },
      'gastro-intestinale perforatie': { nl: 'Zeer zeldzame doorbraak in de darmwand – meld onmiddellijk hevige buikpijn', fr: 'Perforation digestive très rare – signalez immédiatement douleur abdominale intense', en: 'Very rare bowel wall perforation – report severe abdominal pain immediately', de: 'Sehr seltener Darmdurchbruch – melden Sie sofort starke Bauchschmerzen' },
      'trombose': { nl: 'Bloedstolsel – meld pijn/zwelling in benen of plotse kortademigheid', fr: 'Caillot sanguin – signalez douleur/gonflement des jambes ou essoufflement soudain', en: 'Blood clot – report pain/swelling in legs or sudden shortness of breath', de: 'Blutgerinnsel – melden Sie Schmerzen/Schwellungen in den Beinen oder plötzliche Atemnot' },
      'lymfoedeem': { nl: 'Zwelling door vochtophoping (vaak in armen of benen) – meld het tijdig', fr: 'Gonflement par rétention de liquide (souvent bras ou jambes) – signalez-le', en: 'Swelling from fluid retention (often arms or legs) – report promptly', de: 'Schwellung durch Flüssigkeitseinlagerung (oft Arme oder Beine) – rechtzeitig melden' },
      'nefrotoxiciteit': { nl: 'Mogelijke belasting van de nieren – wordt gevolgd via bloedonderzoek', fr: 'Risque rénal possible – suivi par analyses sanguines', en: 'Possible kidney effects – monitored through blood tests', de: 'Mögliche Nierenbelastung – wird durch Blutuntersuchungen überwacht' },
      'eetlustverlies': { nl: 'Verminderde eetlust – probeer kleine, frequente maaltijden', fr: 'Perte d\'appétit – essayez des petits repas fréquents', en: 'Loss of appetite – try small, frequent meals', de: 'Appetitlosigkeit – versuchen Sie kleine, häufige Mahlzeiten' },
      'anorexie': { nl: 'Verminderde eetlust – probeer kleine, frequente maaltijden', fr: 'Perte d\'appétit – essayez des petits repas fréquents', en: 'Loss of appetite – try small, frequent meals', de: 'Appetitlosigkeit – versuchen Sie kleine, häufige Mahlzeiten' },
      'smaakveranderingen': { nl: 'Veranderde smaak – meestal tijdelijk, probeer ander eten', fr: 'Changement de goût – généralement temporaire, essayez d\'autres aliments', en: 'Taste changes – usually temporary, try different foods', de: 'Geschmacksveränderungen – meist vorübergehend, probieren Sie andere Speisen' },
      'dysgeusie': { nl: 'Veranderde smaak – meestal tijdelijk', fr: 'Changement de goût – généralement temporaire', en: 'Taste changes – usually temporary', de: 'Geschmacksveränderungen – meist vorübergehend' },
      'koude handen en voeten': { nl: 'Koude handen en voeten – houd ze warm, meld het als het erger wordt', fr: 'Mains et pieds froids – gardez-les au chaud, signalez si cela s\'aggrave', en: 'Cold hands and feet – keep them warm, report if worsening', de: 'Kalte Hände und Füße – halten Sie sie warm, melden wenn es schlimmer wird' },
      'hypertensie': { nl: 'Verhoogde bloeddruk – wordt regelmatig gecontroleerd', fr: 'Hypertension artérielle – contrôlée régulièrement', en: 'High blood pressure – monitored regularly', de: 'Bluthochdruck – wird regelmäßig kontrolliert' },
      'hypotensie': { nl: 'Verlaagde bloeddruk – sta langzaam op, meld duizeligheid', fr: 'Hypotension – levez-vous lentement, signalez les vertiges', en: 'Low blood pressure – stand up slowly, report dizziness', de: 'Niedriger Blutdruck – stehen Sie langsam auf, melden Sie Schwindel' },
      'duizeligheid': { nl: 'Duizeligheid – sta langzaam op en meld het als het aanhoudt', fr: 'Vertiges – levez-vous lentement et signalez si cela persiste', en: 'Dizziness – stand up slowly and report if persistent', de: 'Schwindel – stehen Sie langsam auf und melden wenn anhaltend' },
      'rugpijn': { nl: 'Rugpijn – meld het als het aanhoudt of erger wordt', fr: 'Mal de dos – signalez si cela persiste ou s\'aggrave', en: 'Back pain – report if persistent or worsening', de: 'Rückenschmerzen – melden wenn anhaltend oder schlimmer werdend' },
      'perifeer oedeem': { nl: 'Zwelling van handen of voeten – meld het als het toeneemt', fr: 'Gonflement des mains ou des pieds – signalez si cela augmente', en: 'Swelling of hands or feet – report if increasing', de: 'Schwellung der Hände oder Füße – melden wenn zunehmend' },
      'pruritus': { nl: 'Jeuk – meld het aan uw arts, er zijn oplossingen', fr: 'Démangeaisons – signalez-le à votre médecin, des solutions existent', en: 'Itching – report to your doctor, solutions are available', de: 'Juckreiz – melden Sie es Ihrem Arzt, es gibt Lösungen' },
      'jeuk': { nl: 'Jeuk – meld het aan uw arts, er zijn oplossingen', fr: 'Démangeaisons – signalez-le, des solutions existent', en: 'Itching – report to your doctor, solutions are available', de: 'Juckreiz – melden Sie es, es gibt Lösungen' },
      'droge huid': { nl: 'Droge huid – gebruik een vochtinbrengende crème zonder parfum', fr: 'Peau sèche – utilisez une crème hydratante sans parfum', en: 'Dry skin – use a fragrance-free moisturizing cream', de: 'Trockene Haut – verwenden Sie eine parfümfreie Feuchtigkeitscreme' },
      'acneïforme uitslag': { nl: 'Acne-achtige huiduitslag – meld dit, er is behandeling mogelijk', fr: 'Éruption acnéiforme – signalez-le, un traitement est possible', en: 'Acne-like skin rash – report this, treatment is available', de: 'Akneartiger Hautausschlag – melden Sie dies, Behandlung ist möglich' },
      // English terms (fallback)
      'cardiotoxicity': { nl: 'Mogelijke belasting van het hart', fr: 'Risque cardiaque possible', en: 'Possible cardiac effects – monitored with regular check-ups', de: 'Mögliche Herzbelastung – regelmäßige Kontrollen' },
      'febrile neutropenia': { nl: 'Koorts door verlaagde afweer', fr: 'Fièvre due à une baisse de l\'immunité', en: 'Fever due to lowered immunity – contact immediately if fever above 38°C', de: 'Fieber durch geschwächte Abwehr – sofort kontaktieren bei Fieber über 38°C' },
      'neutropenia': { nl: 'Verlaagde witte bloedcellen', fr: 'Baisse des globules blancs', en: 'Low white blood cells, making you more susceptible to infections', de: 'Erniedrigte weiße Blutkörperchen' },
      'anemia': { nl: 'Verlaagde rode bloedcellen', fr: 'Baisse des globules rouges', en: 'Low red blood cells, which may cause tiredness or shortness of breath', de: 'Erniedrigte rote Blutkörperchen' },
      'thrombocytopenia': { nl: 'Verlaagde bloedplaatjes', fr: 'Baisse des plaquettes', en: 'Low platelets – you may bruise more easily', de: 'Erniedrigte Blutplättchen' },
      'nausea': { nl: 'Misselijkheid', fr: 'Nausées', en: 'Nausea – effective medications are available', de: 'Übelkeit – wirksame Medikamente sind verfügbar' },
      'vomiting': { nl: 'Braken', fr: 'Vomissements', en: 'Vomiting – report to your doctor', de: 'Erbrechen – melden Sie es Ihrem Arzt' },
      'fatigue': { nl: 'Vermoeidheid', fr: 'Fatigue', en: 'Fatigue – listen to your body and rest enough', de: 'Müdigkeit – hören Sie auf Ihren Körper' },
      'diarrhea': { nl: 'Diarree', fr: 'Diarrhée', en: 'Diarrhea – drink enough fluids and report if persistent', de: 'Durchfall – ausreichend trinken und bei Anhalten melden' },
      'rash': { nl: 'Huiduitslag', fr: 'Éruption cutanée', en: 'Skin rash – report to your doctor', de: 'Hautausschlag – melden Sie es Ihrem Arzt' },
      'constipation': { nl: 'Verstopping', fr: 'Constipation', en: 'Constipation – drink enough fluids and eat fiber-rich food', de: 'Verstopfung – ausreichend trinken und ballaststoffreich essen' },
      'hepatotoxicity': { nl: 'Mogelijke belasting van de lever', fr: 'Risque hépatique possible', en: 'Possible liver effects – monitored through blood tests', de: 'Mögliche Leberbelastung – Blutuntersuchungen' },
      'nephrotoxicity': { nl: 'Mogelijke belasting van de nieren', fr: 'Risque rénal possible', en: 'Possible kidney effects – monitored through blood tests', de: 'Mögliche Nierenbelastung – Blutuntersuchungen' },
      'hypertension': { nl: 'Verhoogde bloeddruk', fr: 'Hypertension artérielle', en: 'High blood pressure – monitored regularly', de: 'Bluthochdruck – wird regelmäßig kontrolliert' },
      'hypothyroidism': { nl: 'Vertraagde werking van de schildklier', fr: 'Ralentissement de la thyroïde', en: 'Underactive thyroid – monitored through blood tests', de: 'Schilddrüsenunterfunktion – Blutuntersuchungen' },
      'erectile dysfunction': { nl: 'Problemen met de erectie', fr: 'Troubles de l\'érection', en: 'Erectile problems – discuss with your doctor', de: 'Erektionsprobleme – besprechen Sie dies mit Ihrem Arzt' },
      'hot flushes': { nl: 'Opvliegers', fr: 'Bouffées de chaleur', en: 'Hot flashes – a known effect of hormonal treatment', de: 'Hitzewallungen – bekannte Wirkung der Hormonbehandlung' },
      'bone pain': { nl: 'Pijn in de botten', fr: 'Douleur osseuse', en: 'Bone pain – report if persistent', de: 'Knochenschmerzen – melden wenn anhaltend' },
      'arthralgia': { nl: 'Pijn in de gewrichten', fr: 'Douleur articulaire', en: 'Joint pain – report to your doctor', de: 'Gelenkschmerzen – melden Sie es Ihrem Arzt' },
      'myalgia': { nl: 'Spierpijn', fr: 'Douleur musculaire', en: 'Muscle pain – usually temporary', de: 'Muskelschmerzen – meist vorübergehend' },
      'proteinuria': { nl: 'Eiwit in de urine', fr: 'Protéines dans les urines', en: 'Protein in urine – monitored through urine tests', de: 'Eiweiß im Urin – Urinuntersuchungen' },
      'peripheral edema': { nl: 'Zwelling van handen of voeten', fr: 'Gonflement des mains ou des pieds', en: 'Swelling of hands or feet – report if increasing', de: 'Schwellung der Hände oder Füße – melden wenn zunehmend' },
      'dysgeusia': { nl: 'Veranderde smaak', fr: 'Changement de goût', en: 'Taste changes – usually temporary', de: 'Geschmacksveränderungen – meist vorübergehend' },
      'thrombosis': { nl: 'Bloedstolsel', fr: 'Caillot sanguin', en: 'Blood clot – report pain/swelling in legs or shortness of breath', de: 'Blutgerinnsel – Schmerzen/Schwellung in Beinen oder Atemnot melden' },
      'wound healing complications': { nl: 'Tragere wondgenezing', fr: 'Cicatrisation retardée', en: 'Delayed wound healing – report if wounds don\'t heal well', de: 'Verzögerte Wundheilung' },
      'gastrointestinal perforation': { nl: 'Doorbraak in de darmwand', fr: 'Perforation digestive', en: 'Bowel wall perforation – report severe abdominal pain immediately', de: 'Darmdurchbruch – sofort starke Bauchschmerzen melden' },
      'infertility': { nl: 'Mogelijke invloed op de vruchtbaarheid', fr: 'Risque possible sur la fertilité', en: 'Possible effect on fertility – discuss before starting', de: 'Mögliche Auswirkung auf die Fruchtbarkeit' },
    };
    const cleaned = term.toLowerCase().trim();
    const getLang = (entry: { nl: string; fr: string; en?: string; de?: string }) => {
      if (isEn && entry.en) return entry.en;
      if (isDe && entry.de) return entry.de;
      if (isFr) return entry.fr;
      return entry.nl;
    };
    if (map[cleaned]) return getLang(map[cleaned]);
    const withoutParens = cleaned.replace(/\s*\(.*?\)\s*$/, '').trim();
    if (withoutParens !== cleaned && map[withoutParens]) return getLang(map[withoutParens]);
    return term;
  };

  const rawCommon = drug.side_effects?.common || drug.side_effects?.veel_voorkomend || [];
  const rawSerious = drug.side_effects?.serious || drug.side_effects?.ernstig || [];
  const commonSE = rawCommon.map(humanize);
  const seriousSE = rawSerious.map(humanize);

  // Categorize side effects by body system
  const seCategories: Record<string, { icon: string; label: Record<string, string>; keywords: string[] }> = {
    blood: {
      icon: '🩸',
      label: { nl: 'Bloed', fr: 'Sang', en: 'Blood', de: 'Blut' },
      keywords: ['neutro', 'leuko', 'anemie', 'anemia', 'trombocyto', 'thrombocyto', 'myelosuppressie', 'bloedcel', 'blood cell', 'witte bloedcel', 'rode bloedcel', 'bloedplaatjes', 'platelet', 'febriele', 'febrile', 'koorts door verlaagde', 'fever due to lowered'],
    },
    gi: {
      icon: '🫃',
      label: { nl: 'Maag-darm', fr: 'Gastro-intestinal', en: 'Gastrointestinal', de: 'Magen-Darm' },
      keywords: ['misselijk', 'nausea', 'braken', 'vomit', 'diarree', 'diarrhea', 'durchfall', 'obstipatie', 'constipat', 'verstopf', 'buikpijn', 'abdominal', 'bauchschmerz', 'stomatitis', 'mucositis', 'mond', 'mouth', 'mund', 'smaak', 'taste', 'geschmack', 'übelkeit', 'erbrechen', 'doorbraak in de darmwand', 'perforation'],
    },
    skin: {
      icon: '🧴',
      label: { nl: 'Huid & haar', fr: 'Peau & cheveux', en: 'Skin & hair', de: 'Haut & Haare' },
      keywords: ['huid', 'skin', 'haut', 'uitslag', 'rash', 'ausschlag', 'alopecia', 'haar', 'hair', 'hand-voet', 'palm', 'sole', 'handfläch', 'voetzol', 'nagel', 'nail', 'droge huid', 'dry skin', 'trockene haut', 'acne', 'jeuk', 'itch', 'juckreiz', 'pruritus'],
    },
    neuro: {
      icon: '🧠',
      label: { nl: 'Zenuwstelsel', fr: 'Système nerveux', en: 'Nervous system', de: 'Nervensystem' },
      keywords: ['neuropathie', 'neuropathy', 'tintel', 'tingling', 'kribbel', 'gevoelloos', 'numbness', 'taubheit', 'hoofdpijn', 'headache', 'kopfschmerz'],
    },
    cardiac: {
      icon: '❤️',
      label: { nl: 'Hart & vaten', fr: 'Cœur & vaisseaux', en: 'Heart & vessels', de: 'Herz & Gefäße' },
      keywords: ['cardio', 'hart', 'heart', 'herz', 'bloeddruk', 'hypertens', 'blutdruck', 'blood pressure', 'stolsel', 'clot', 'thrombos', 'gerinnsel', 'oedeem', 'edema', 'ödem', 'zwelling', 'swelling', 'schwellung'],
    },
    general: {
      icon: '💊',
      label: { nl: 'Algemeen', fr: 'Général', en: 'General', de: 'Allgemein' },
      keywords: [],
    },
  };

  const categorizeSE = (item: string): string => {
    const lower = item.toLowerCase();
    for (const [key, cat] of Object.entries(seCategories)) {
      if (key === 'general') continue;
      if (cat.keywords.some(kw => lower.includes(kw))) return key;
    }
    return 'general';
  };

  const groupSEByCategory = (items: string[]): Record<string, string[]> => {
    const groups: Record<string, string[]> = {};
    items.forEach(item => {
      const cat = categorizeSE(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  };

  const renderGroupedSE = (items: string[], bgAlt: string): string => {
    const groups = groupSEByCategory(items);
    const catOrder = ['blood', 'gi', 'skin', 'neuro', 'cardiac', 'general'];
    return catOrder
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => {
        const info = seCategories[cat];
        const catLabel = info.label[language] || info.label['nl'];
        return `<div style="margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
            <span style="font-size:${fontSize - 2}px;">${info.icon}</span>
            <span style="font-size:${fontSize - 2}px; font-weight:600; color:#555;">${catLabel}</span>
          </div>
          ${groups[cat].map((se, i) => `<div style="padding:2px 6px 2px 20px; font-size:${listFontSize}px; color:#333; background:${i % 2 === 0 ? 'transparent' : bgAlt};">• ${se}</div>`).join('')}
        </div>`;
      }).join('');
  };

  const tipItems = drug.patient_counseling_points || [];
  const monitorItems = drug.monitoring_requirements || [];

  const listHtml = (items: string[]) =>
    items.length > 0 ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '';

  const sectionFontSize = fontSize;
  const listFontSize = fontSize;
  const h2FontSize = fontSize + 2;
  const contactFontSize = fontSize - 1;
  const footerFontSize = fontSize - 3;
  const disclaimerTitleSize = fontSize - 4;
  const disclaimerTextSize = fontSize - 5;

  const disclaimerTitle = language === 'fr' ? 'Avis important' : language === 'de' ? 'Wichtiger Hinweis' : language === 'en' ? 'Important notice' : 'Belangrijke mededeling';
  const disclaimerText = language === 'fr' ? 'Ce document est uniquement destiné à des fins informatives et ne constitue pas un dispositif médical (MDR 2017/745). Son contenu peut contenir des erreurs et ne doit pas servir de base unique pour des décisions cliniques. Consultez toujours votre médecin ou pharmacien.' : language === 'de' ? 'Dieses Dokument dient ausschließlich zu Informationszwecken und ist kein Medizinprodukt (MDR 2017/745). Der Inhalt kann Fehler enthalten und darf nicht als alleinige Grundlage für klinische Entscheidungen dienen. Konsultieren Sie immer Ihren Arzt oder Apotheker.' : language === 'en' ? 'This document is for informational purposes only and is not a medical device (MDR 2017/745). Its content may contain errors and should not serve as the sole basis for clinical decisions. Always consult your physician or pharmacist.' : 'Dit document is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel (MDR 2017/745). De inhoud kan fouten bevatten en mag niet als enige basis voor klinische beslissingen dienen. Raadpleeg altijd uw behandelend arts of apotheker.';
  const disclaimerHtml = `<div class="print-disclaimer"><p class="print-disclaimer-title">⚠ ${disclaimerTitle}</p><p class="print-disclaimer-text">${disclaimerText}</p></div>`;

  return `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'nl'}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 12mm; }
     * { margin: 0; padding: 0; box-sizing: border-box; }
     html, body { height: 100%; }
     body {
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
       font-size: ${fontSize}px; line-height: 1.55; color: #1a1a1a;
       padding: 10mm; background: white;
     }
     .page-container { display: flex; flex-direction: column; }
     .page-content { flex: 1 1 auto; }
     .page-footer-block { flex-shrink: 0; margin-top: 16px; }
     .preview-badge { background: ${hospitalColor}; color: white; text-align: center; padding: 6px; font-size: 12px; border-radius: 4px; margin-bottom: 12px; letter-spacing: 0.5px; }
     .logo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid ${hospitalColor}; }
     .logo-name { display: flex; align-items: center; gap: 10px; }
     .logo-header img { max-height: 55px; max-width: 200px; width: auto; height: auto; object-fit: contain; }
     .hospital-name { font-size: 18px; font-weight: 800; color: ${hospitalColor}; }
     .header-title { text-align: right; }
     .header-title h1 { color: ${hospitalColor}; font-size: 20px; margin-bottom: 2px; }
     .header-title .subtitle { color: #666; font-size: ${fontSize - 1}px; }
     .content { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
     .section { margin-bottom: 8px; }
     .section h2 { color: ${hospitalColor}; font-size: ${h2FontSize}px; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #e0e0e0; }
     .section p { margin-bottom: 4px; color: #333; font-size: ${sectionFontSize}px; }
     .section ul { margin-left: 14px; margin-bottom: 4px; }
     .section li { margin-bottom: 2px; color: #333; font-size: ${listFontSize}px; }
     .warning-box { background: #fff8e6; border-left: 3px solid #e87722; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
     .warning-box h3 { color: #cc7a00; font-size: ${sectionFontSize}px; margin-bottom: 3px; }
     .danger-box { background: #ffe6e6; border-left: 3px solid #cc0000; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
     .danger-box h3 { color: #cc0000; font-size: ${sectionFontSize}px; margin-bottom: 3px; }
     .selfcare-box { background: #e8f5e9; border-left: 3px solid #388e3c; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
     .selfcare-box h3 { color: #2e7d32; font-size: ${sectionFontSize}px; margin-bottom: 3px; }
     .info-box { background: #f5e6f0; border-left: 3px solid ${hospitalColor}; padding: 6px 8px; margin: 4px 0; border-radius: 0 3px 3px 0; }
     .full-width { grid-column: 1 / -1; }
     .contact-section { background: #f5f5f5; padding: 8px 10px; border-radius: 4px; font-size: ${contactFontSize}px; }
     .contact-section h2 { font-size: ${contactFontSize + 2}px; margin-bottom: 6px; color: ${hospitalColor}; }
     .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
     .footer { padding-top: 6px; border-top: 1px solid #e0e0e0; font-size: ${footerFontSize}px; color: #666; text-align: center; }
      .page-break { page-break-before: always; break-before: page; margin-top: 30px; padding-top: 20px; border-top: 3px dashed #ccc; }
      .print-disclaimer { margin-top: 8px; padding: 8px 10px; border: 1.5px solid #cc0000; border-radius: 6px; background: #fff5f5; }
      .print-disclaimer-title { font-weight: 700; color: #cc0000; font-size: ${disclaimerTitleSize}px; margin-bottom: 3px; }
      .print-disclaimer-text { font-size: ${disclaimerTextSize}px; color: #444; line-height: 1.4; }
      @media print {
        .preview-badge { display: none !important; }
        .page-break { margin-top: 0; padding-top: 10mm; border-top: none; }
        body { padding: 10mm; padding-bottom: 28mm; }
        .fixed-print-disclaimer { position: fixed; bottom: 0; left: 10mm; right: 10mm; background: white; z-index: 999; }
        .inline-disclaimer { display: none !important; }
      }
      @media screen { .fixed-print-disclaimer { display: none !important; } }
     .timeline { position: relative; margin: 16px 0; padding-left: 0; }
     .timeline-line { position: absolute; left: 22px; top: 0; bottom: 0; width: 3px; background: ${hospitalColor}; border-radius: 2px; }
     .timeline-item { position: relative; display: flex; align-items: flex-start; margin-bottom: 14px; padding-left: 50px; }
     .timeline-dot { position: absolute; left: 14px; top: 4px; width: 18px; height: 18px; border-radius: 50%; background: ${hospitalColor}; border: 2px solid white; box-shadow: 0 0 0 2px ${hospitalColor}; z-index: 1; }
     .timeline-content { background: #f8f5f7; border: 1px solid #e8dce5; border-radius: 8px; padding: 10px 14px; flex: 1; }
     .timeline-content h3 { font-size: ${fontSize}px; color: ${hospitalColor}; margin-bottom: 3px; font-weight: 700; }
     .timeline-route { display: inline-block; background: ${hospitalColor}; color: white; padding: 1px 7px; border-radius: 10px; font-size: ${fontSize - 4}px; font-weight: 600; }
     .timeline-timing { font-size: ${fontSize - 2}px; color: #555; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="preview-badge">${labels.preview}</div>
  <div class="page-container">
  <div class="logo-header">
    <div class="logo-name">
      ${hospitalLogoUrl ? `<img src="${hospitalLogoUrl}" alt="${hospitalName}" />` : `<img src="/images/logo-rzt.png" alt="Logo" />`}
      <span class="hospital-name">${hospitalName}</span>
    </div>
    <div class="header-title">
      <h1>${drug.generic_name}${brandNamesText}</h1>
      <p class="subtitle">${labels.title}</p>
    </div>
  </div>

  <div class="page-content">
  <div class="content">
    ${introText ? `<div class="section"><h2>${labels.whatIs}</h2><p>${introText}</p></div>` : ''}
    ${usageItems.length > 0 ? `<div class="section"><h2>${labels.usedFor}</h2>${listHtml(usageItems)}</div>` : ''}
    ${includeDosing && dosingItems.length > 0 ? `<div class="section"><h2>${labels.howGiven}</h2>${listHtml(dosingItems)}</div>` : ''}
    ${premedicatieItems.length > 0 ? `<div class="section"><h2>${labels.premedicatie}</h2><p style="font-size: ${fontSize - 2}px; color: #666; font-style: italic;">${isFr ? 'Voir le schéma ci-joint' : language === 'de' ? 'Siehe beigefügtes Schema' : language === 'en' ? 'See attached schedule' : 'Zie bijgevoegd schema'}</p></div>` : ''}

    ${includeSideEffects && (commonSE.length > 0 || seriousSE.length > 0) ? `
    <div class="section full-width">
      <h2>${labels.sideEffects}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${commonSE.length > 0 ? `<div class="warning-box"><h3>⚡ ${labels.commonSE}</h3>${renderGroupedSE(commonSE, 'rgba(232,119,34,0.06)')}</div>` : ''}
        ${seriousSE.length > 0 ? `<div class="danger-box"><h3>🚨 ${labels.seriousSE}</h3>${renderGroupedSE(seriousSE, 'rgba(204,0,0,0.04)')}</div>` : ''}
      </div>
    </div>` : ''}

    <div class="section full-width">
      <h2>${labels.selfCare}</h2>
      <div class="selfcare-box">
        <h3>${isFr ? 'Conseils pratiques' : 'Praktische tips'}</h3>
        <p style="font-size: ${fontSize - 3}px; color: #555; font-style: italic;">${isFr ? 'Des conseils personnalisés seront générés automatiquement.' : 'Gepersonaliseerde tips worden automatisch gegenereerd.'}</p>
      </div>
    </div>

    ${tipItems.length > 0 ? `<div class="section"><h2>${labels.tips}</h2><div class="info-box">${listHtml(tipItems)}</div></div>` : ''}
    ${monitorItems.length > 0 ? `<div class="section"><h2>${labels.monitoring}</h2>${listHtml(monitorItems)}</div>` : ''}
  </div>
  </div>

  <div class="page-footer-block">
     <div class="contact-section full-width">
      <h2>${labels.contact}</h2>
      <div class="contact-grid">
        <p><strong>${labels.physician}:</strong> ${physicianName || '_________________'}</p>
        <p><strong>${labels.nurse}:</strong> ${nurseName || '_________________'}</p>
        <p><strong>${labels.phone}:</strong> ${phoneNumber || nursePhone || ''}</p>
      </div>
    </div>

    <div class="inline-disclaimer">${disclaimerHtml}</div>

    <div class="footer"><p>${labels.footer}</p></div>
  </div>
  </div>

  <div class="fixed-print-disclaimer">${disclaimerHtml}</div>

    <div class="footer"><p>${labels.footer}</p></div>
  </div>
  </div>

  ${premedicatieItems.length > 0 ? `
  <div class="page-break" style="display: flex; flex-direction: column; min-height: calc(297mm - 24mm);">
    <div class="page-content">
    <div class="logo-header">
      <div class="logo-name">
        ${hospitalLogoUrl ? `<img src="${hospitalLogoUrl}" alt="${hospitalName}" />` : `<img src="/images/logo-rzt.png" alt="Logo" />`}
        <span class="hospital-name">${hospitalName}</span>
      </div>
      <div class="header-title">
        <h1>${labels.premedicatie}</h1>
        <p class="subtitle">${drug.generic_name}${brandNamesText}</p>
      </div>
    </div>
    <div style="margin-top: 20px;">
      <h2 style="color: ${hospitalColor}; font-size: 16px; margin-bottom: 16px; padding-bottom: 4px; border-bottom: 2px solid ${hospitalColor};">${isFr ? 'Schéma des médicaments de soutien' : language === 'de' ? 'Schema Begleitmedikation' : language === 'en' ? 'Supportive medication schedule' : 'Schema ondersteunende medicatie'}</h2>
      <div class="timeline">
        <div class="timeline-line"></div>
        ${premedicatieItems.map(item => {
          const match = item.match(/^(.+?)\s*\((\w+)\)\s*[–\-]\s*(.+)$/);
          const name = match ? match[1].trim() : item;
          const route = match ? match[2] : '';
          const timing = match ? match[3].trim() : '';
          return `<div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <h3>${name}</h3>
              ${route ? `<div><span class="timeline-route">${route}</span></div>` : ''}
              ${timing ? `<div class="timeline-timing">⏱ <strong>${timing}</strong></div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    </div>

    <div class="page-footer-block">
      <div class="contact-section full-width">
        <h2>${labels.contact}</h2>
        <div class="contact-grid">
          <p><strong>${labels.physician}:</strong> ${physicianName || '_________________'}</p>
          <p><strong>${labels.nurse}:</strong> ${nurseName || '_________________'}</p>
          <p><strong>${labels.phone}:</strong> ${phoneNumber || nursePhone || ''}</p>
        </div>
      </div>

      <div class="inline-disclaimer">${disclaimerHtml}</div>
      <div class="footer"><p>${labels.footer}</p></div>
    </div>
  </div>
  ` : ''}
</body>
</html>`;
}
