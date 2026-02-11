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
  const usageItems = folderMode === 'uitgebreid' 
    ? (drug.approved_indications || []) 
    : (drug.approved_indications?.slice(0, 4) || []);
  
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
        if (di.standard_dose && folderMode === 'uitgebreid') dosingItems.push(`${isFr ? 'Dose' : 'Dosis'}: ${di.standard_dose}`);
        if (di.frequency) dosingItems.push(di.frequency);
        if (drug.cycle_length_days) dosingItems.push(`${isFr ? 'Cycle' : 'Cyclus'}: ${drug.cycle_length_days} ${isFr ? 'jours' : 'dagen'}`);
        if (di.duration) dosingItems.push(`${isFr ? 'Durée' : 'Duur'}: ${di.duration}`);
        if (di.max_dose && folderMode === 'uitgebreid') dosingItems.push(`Max: ${di.max_dose}`);
      }
      if (di.notes) dosingItems.push(di.notes);
      // In uitgebreid mode, show dose adjustments
      if (folderMode === 'uitgebreid' && di.dose_adjustments?.length) {
        for (const adj of di.dose_adjustments) {
          dosingItems.push(`${adj.condition}: ${adj.adjustment}`);
        }
      }
    }
    // Fallback to common_regimens
    if (dosingItems.length === 0 && drug.common_regimens?.length > 0) {
      dosingItems = folderMode === 'uitgebreid' 
        ? [...drug.common_regimens] 
        : drug.common_regimens.slice(0, 3);
    }
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
      // Urologie-specifieke termen
      'erectiele dysfunctie': { nl: 'Problemen met de erectie – bespreek dit met uw arts, er zijn oplossingen', fr: 'Troubles de l\'érection – parlez-en à votre médecin, des solutions existent' },
      'urine-incontinentie': { nl: 'Ongewild urineverlies – er bestaan oefeningen en hulpmiddelen die helpen', fr: 'Perte involontaire d\'urine – des exercices et des aides existent' },
      'hematurie': { nl: 'Bloed in de urine – meld dit aan uw arts', fr: 'Sang dans les urines – signalez-le à votre médecin' },
      'urineretentie': { nl: 'Moeilijk plassen of niet kunnen plassen – neem contact op met uw arts', fr: 'Difficultés à uriner – contactez votre médecin' },
      'urineweginfectie': { nl: 'Blaasontsteking – meld pijn bij het plassen of koorts', fr: 'Infection urinaire – signalez douleur en urinant ou fièvre' },
      'cystitis': { nl: 'Blaasontsteking – meld pijn bij het plassen of koorts', fr: 'Cystite – signalez douleur en urinant ou fièvre' },
      'opvliegers': { nl: 'Opvliegers (warmte-aanvallen) – een bekend gevolg van de hormoonbehandeling', fr: 'Bouffées de chaleur – effet connu du traitement hormonal' },
      'hot flashes': { nl: 'Opvliegers (warmte-aanvallen) – een bekend gevolg van de hormoonbehandeling', fr: 'Bouffées de chaleur – effet connu du traitement hormonal' },
      'gynaecomastie': { nl: 'Zwelling van het borstweefsel – meld het als het last geeft', fr: 'Gonflement du tissu mammaire – signalez si cela vous gêne' },
      'botpijn': { nl: 'Pijn in de botten – meld het als het aanhoudt, pijnstilling is mogelijk', fr: 'Douleur osseuse – signalez si cela persiste, un traitement antidouleur est possible' },
      'gewrichtspijn': { nl: 'Pijn in de gewrichten – meld het, er is pijnstilling mogelijk', fr: 'Douleur articulaire – signalez-le, un traitement antidouleur est possible' },
      'artralgie': { nl: 'Pijn in de gewrichten – meld het aan uw arts', fr: 'Douleur articulaire – signalez-le à votre médecin' },
      'myalgie': { nl: 'Spierpijn – meestal tijdelijk, meld het als het aanhoudt', fr: 'Douleur musculaire – généralement temporaire, signalez si cela persiste' },
      'proteïnurie': { nl: 'Eiwit in de urine – wordt gevolgd via urineonderzoek', fr: 'Protéines dans les urines – suivi par analyse d\'urine' },
      'hyperglykemie': { nl: 'Verhoogde bloedsuiker – wordt gevolgd via bloedonderzoek', fr: 'Glycémie élevée – suivie par analyses sanguines' },
      'hypokaliëmie': { nl: 'Verlaagd kalium in het bloed – wordt gevolgd via bloedonderzoek', fr: 'Potassium bas dans le sang – suivi par analyses sanguines' },
      'hyponatriëmie': { nl: 'Verlaagd natrium in het bloed – wordt gevolgd via bloedonderzoek', fr: 'Sodium bas dans le sang – suivi par analyses sanguines' },
      'libidoverlies': { nl: 'Verminderd seksueel verlangen – een bekend gevolg van de behandeling, bespreek het', fr: 'Diminution du désir sexuel – effet connu du traitement, parlez-en' },
      'verminderd libido': { nl: 'Verminderd seksueel verlangen – een bekend gevolg van de behandeling, bespreek het', fr: 'Diminution du désir sexuel – effet connu du traitement, parlez-en' },
      'nierfunctiestoornissen': { nl: 'Verminderde nierwerking – wordt gevolgd via bloedonderzoek', fr: 'Diminution de la fonction rénale – suivie par analyses sanguines' },
      'droge mond': { nl: 'Droge mond – drink regelmatig kleine slokjes water', fr: 'Bouche sèche – buvez régulièrement de petites gorgées d\'eau' },
      'xerostomie': { nl: 'Droge mond – drink regelmatig kleine slokjes water', fr: 'Bouche sèche – buvez régulièrement de petites gorgées d\'eau' },
      'schildklierafwijkingen': { nl: 'Verandering in de schildklierfunctie – wordt gevolgd via bloedonderzoek', fr: 'Modification de la fonction thyroïdienne – suivie par analyses sanguines' },
      'hypothyreoïdie': { nl: 'Vertraagde werking van de schildklier – wordt gevolgd via bloedonderzoek', fr: 'Ralentissement de la thyroïde – suivi par analyses sanguines' },
      'hyperthyreoïdie': { nl: 'Versnelde werking van de schildklier – wordt gevolgd via bloedonderzoek', fr: 'Accélération de la thyroïde – suivie par analyses sanguines' },
      'ototoxiciteit': { nl: 'Mogelijke gehoorschade – meld oorsuizen of gehoorverlies', fr: 'Risque auditif – signalez acouphènes ou perte d\'audition' },
      'tinnitus': { nl: 'Oorsuizen – meld dit aan uw arts', fr: 'Acouphènes – signalez-le à votre médecin' },
      // Gynaecologie-specifieke termen
      'vaginale bloeding': { nl: 'Bloedverlies uit de vagina – meld dit aan uw arts', fr: 'Saignement vaginal – signalez-le à votre médecin' },
      'vaginale droogheid': { nl: 'Droogheid in de vagina – bespreek dit met uw arts, er zijn oplossingen', fr: 'Sécheresse vaginale – parlez-en à votre médecin, des solutions existent' },
      'amenorroe': { nl: 'Uitblijven van de menstruatie – een verwacht gevolg van de behandeling', fr: 'Absence de règles – effet attendu du traitement' },
      'menopausale klachten': { nl: 'Klachten door overgang (opvliegers, nachtzweten) – meld het als het lastig is', fr: 'Symptômes ménopausiques (bouffées de chaleur, sueurs nocturnes) – signalez si gênant' },
      'nachtzweten': { nl: 'Nachtzweten – een bekend gevolg van de hormoonbehandeling', fr: 'Sueurs nocturnes – effet connu du traitement hormonal' },
      'osteoporose': { nl: 'Botontkalking – uw arts volgt dit op en kan botbescherming voorschrijven', fr: 'Ostéoporose – votre médecin surveille et peut prescrire une protection osseuse' },
      'ovariumfalen': { nl: 'Verminderde werking van de eierstokken – een gevolg van de behandeling', fr: 'Insuffisance ovarienne – conséquence du traitement' },
      'fertiliteitsrisico': { nl: 'Mogelijke invloed op de vruchtbaarheid – bespreek dit vóór de start van de behandeling', fr: 'Risque possible sur la fertilité – discutez-en avant de commencer le traitement' },
      'infertiliteit': { nl: 'Mogelijke invloed op de vruchtbaarheid – bespreek dit vóór de start', fr: 'Risque possible sur la fertilité – discutez-en avant de commencer' },
      'ascites': { nl: 'Vochtophoping in de buik – meld toenemende buikomvang of ongemak', fr: 'Accumulation de liquide dans l\'abdomen – signalez augmentation du volume abdominal' },
      'ileus': { nl: 'Darmstilstand – meld onmiddellijk aanhoudende buikpijn, opgeblazen gevoel of braken', fr: 'Arrêt intestinal – signalez immédiatement douleurs abdominales, ballonnements ou vomissements' },
      'darmobstructie': { nl: 'Verstopping van de darm – meld onmiddellijk buikpijn en braken', fr: 'Obstruction intestinale – signalez immédiatement douleurs abdominales et vomissements' },
      'fistel': { nl: 'Abnormale verbinding tussen organen – meld ongewone afscheiding of pijn', fr: 'Communication anormale entre organes – signalez écoulement inhabituel ou douleur' },
      'wondgenezingsstoornissen': { nl: 'Tragere wondgenezing – meld het als wonden niet goed genezen', fr: 'Cicatrisation retardée – signalez si les plaies ne guérissent pas bien' },
      'bloedingen': { nl: 'Verhoogd risico op bloedingen – meld ongewoon bloedverlies', fr: 'Risque accru de saignements – signalez tout saignement inhabituel' },
      'gastro-intestinale perforatie': { nl: 'Zeer zeldzame doorbraak in de darmwand – meld onmiddellijk hevige buikpijn', fr: 'Perforation digestive très rare – signalez immédiatement douleur abdominale intense' },
      'trombose': { nl: 'Bloedstolsel – meld pijn/zwelling in benen of plotse kortademigheid', fr: 'Caillot sanguin – signalez douleur/gonflement des jambes ou essoufflement soudain' },
      'lymfoedeem': { nl: 'Zwelling door vochtophoping (vaak in armen of benen) – meld het tijdig', fr: 'Gonflement par rétention de liquide (souvent bras ou jambes) – signalez-le' },
      'nefrotoxiciteit': { nl: 'Mogelijke belasting van de nieren – wordt gevolgd via bloedonderzoek', fr: 'Risque rénal possible – suivi par analyses sanguines' },
      'eetlustverlies': { nl: 'Verminderde eetlust – probeer kleine, frequente maaltijden', fr: 'Perte d\'appétit – essayez des petits repas fréquents' },
      'anorexie': { nl: 'Verminderde eetlust – probeer kleine, frequente maaltijden', fr: 'Perte d\'appétit – essayez des petits repas fréquents' },
      'smaakveranderingen': { nl: 'Veranderde smaak – meestal tijdelijk, probeer ander eten', fr: 'Changement de goût – généralement temporaire, essayez d\'autres aliments' },
      'dysgeusie': { nl: 'Veranderde smaak – meestal tijdelijk', fr: 'Changement de goût – généralement temporaire' },
      'koude handen en voeten': { nl: 'Koude handen en voeten – houd ze warm, meld het als het erger wordt', fr: 'Mains et pieds froids – gardez-les au chaud, signalez si cela s\'aggrave' },
      'hypertensie': { nl: 'Verhoogde bloeddruk – wordt regelmatig gecontroleerd', fr: 'Hypertension artérielle – contrôlée régulièrement' },
      'hypotensie': { nl: 'Verlaagde bloeddruk – sta langzaam op, meld duizeligheid', fr: 'Hypotension – levez-vous lentement, signalez les vertiges' },
      'duizeligheid': { nl: 'Duizeligheid – sta langzaam op en meld het als het aanhoudt', fr: 'Vertiges – levez-vous lentement et signalez si cela persiste' },
      'rugpijn': { nl: 'Rugpijn – meld het als het aanhoudt of erger wordt', fr: 'Mal de dos – signalez si cela persiste ou s\'aggrave' },
      'perifeer oedeem': { nl: 'Zwelling van handen of voeten – meld het als het toeneemt', fr: 'Gonflement des mains ou des pieds – signalez si cela augmente' },
      'pruritus': { nl: 'Jeuk – meld het aan uw arts, er zijn oplossingen', fr: 'Démangeaisons – signalez-le à votre médecin, des solutions existent' },
      'jeuk': { nl: 'Jeuk – meld het aan uw arts, er zijn oplossingen', fr: 'Démangeaisons – signalez-le, des solutions existent' },
      'droge huid': { nl: 'Droge huid – gebruik een vochtinbrengende crème zonder parfum', fr: 'Peau sèche – utilisez une crème hydratante sans parfum' },
      'acneïforme uitslag': { nl: 'Acne-achtige huiduitslag – meld dit, er is behandeling mogelijk', fr: 'Éruption acnéiforme – signalez-le, un traitement est possible' },
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
      'erectile dysfunction': { nl: 'Problemen met de erectie – bespreek dit met uw arts, er zijn oplossingen', fr: 'Troubles de l\'érection – parlez-en à votre médecin, des solutions existent' },
      'hot flushes': { nl: 'Opvliegers – een bekend gevolg van de hormoonbehandeling', fr: 'Bouffées de chaleur – effet connu du traitement hormonal' },
      'bone pain': { nl: 'Pijn in de botten – meld het als het aanhoudt', fr: 'Douleur osseuse – signalez si cela persiste' },
      'arthralgia': { nl: 'Pijn in de gewrichten – meld het aan uw arts', fr: 'Douleur articulaire – signalez-le à votre médecin' },
      'myalgia': { nl: 'Spierpijn – meestal tijdelijk', fr: 'Douleur musculaire – généralement temporaire' },
      'proteinuria': { nl: 'Eiwit in de urine – wordt gevolgd via urineonderzoek', fr: 'Protéines dans les urines – suivi par analyse d\'urine' },
      'peripheral edema': { nl: 'Zwelling van handen of voeten – meld het als het toeneemt', fr: 'Gonflement des mains ou des pieds – signalez si cela augmente' },
      'dysgeusia': { nl: 'Veranderde smaak – meestal tijdelijk', fr: 'Changement de goût – généralement temporaire' },
      'thrombosis': { nl: 'Bloedstolsel – meld pijn/zwelling in benen of kortademigheid', fr: 'Caillot sanguin – signalez douleur/gonflement des jambes ou essoufflement' },
      'wound healing complications': { nl: 'Tragere wondgenezing – meld het als wonden niet goed genezen', fr: 'Cicatrisation retardée – signalez si les plaies ne guérissent pas bien' },
      'gastrointestinal perforation': { nl: 'Zeer zeldzame doorbraak in de darmwand – meld onmiddellijk hevige buikpijn', fr: 'Perforation digestive très rare – signalez immédiatement douleur abdominale intense' },
      'infertility': { nl: 'Mogelijke invloed op de vruchtbaarheid – bespreek dit vóór de start', fr: 'Risque possible sur la fertilité – discutez-en avant de commencer' },
    };
    // Strip percentages and parenthetical details for matching, e.g. "Neutropenie (80%)" -> "neutropenie"
    const cleaned = term.toLowerCase().trim();
    if (map[cleaned]) return isFr ? map[cleaned].fr : map[cleaned].nl;
    // Try without parenthetical suffix
    const withoutParens = cleaned.replace(/\s*\(.*?\)\s*$/, '').trim();
    if (withoutParens !== cleaned && map[withoutParens]) return isFr ? map[withoutParens].fr : map[withoutParens].nl;
    return term;
  };

  const commonSE = folderMode === 'uitgebreid'
    ? (drug.side_effects?.common || []).map(humanize)
    : (drug.side_effects?.common?.slice(0, 5) || []).map(humanize);
  const seriousSE = folderMode === 'uitgebreid'
    ? (drug.side_effects?.serious || []).map(humanize)
    : (drug.side_effects?.serious?.slice(0, 3) || []).map(humanize);
  const contraItems = folderMode === 'uitgebreid'
    ? (drug.contraindications || [])
    : (drug.contraindications?.slice(0, 4) || []);
  const tipItems = folderMode === 'uitgebreid'
    ? (drug.patient_counseling_points || [])
    : (drug.patient_counseling_points?.slice(0, 4) || []);
  const monitorItems = folderMode === 'uitgebreid'
    ? (drug.monitoring_requirements || [])
    : (drug.monitoring_requirements?.slice(0, 4) || []);

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
    ${includeDosing && dosingItems.length > 0 ? `<div class="section"><h2>${labels.howGiven}</h2>${listHtml(dosingItems)}</div>` : ''}
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
