import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function humanizeSideEffects(
  commonText: string | null,
  seriousText: string | null,
  drugName: string,
  language: string,
): Promise<{ commonHumanized: string | null; seriousHumanized: string | null; selfCareTips: string | null }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || (!commonText && !seriousText)) {
    return { commonHumanized: commonText, seriousHumanized: seriousText, selfCareTips: null };
  }

  const langMap: Record<string, string> = { fr: 'French', de: 'German', en: 'English', nl: 'Dutch' };
  const lang = langMap[language] || 'Dutch';

  const prompt = `You are writing patient-friendly information about the medication "${drugName}" in ${lang}.

Given these side effects, do THREE things:

1. "common_friendly": Rewrite the common side effects as a short, reassuring paragraph in ${lang}. Don't just list them — describe what the patient might experience in everyday language. Example style: "U kunt zich moe voelen of last krijgen van misselijkheid. Sommige patiënten merken dat..." Keep it warm and human.

2. "serious_friendly": Rewrite the serious side effects as a clear warning paragraph in ${lang}. Be direct but not alarming. Example: "In zeldzame gevallen kunnen ernstigere reacties optreden, zoals..."

3. "self_care": Write 4-6 practical self-care tips in ${lang} that patients can do themselves to manage side effects. Format as bullet points starting with "•". Be specific and actionable. Examples: "• Drink minstens 1,5 liter water per dag om uitdroging te voorkomen", "• Eet kleine, frequente maaltijden als u last heeft van misselijkheid"

Common side effects:
${commonText || 'None provided'}

Serious side effects:
${seriousText || 'None provided'}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are a compassionate medical writer creating patient information in ${lang}. Return only valid JSON.` },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'format_side_effects',
            description: 'Return humanized side effects and self-care tips',
            parameters: {
              type: 'object',
              properties: {
                common_friendly: { type: 'string', description: `Patient-friendly paragraph about common side effects in ${lang}` },
                serious_friendly: { type: 'string', description: `Patient-friendly paragraph about serious side effects in ${lang}` },
                self_care: { type: 'string', description: `Bullet-point self-care tips (each line starting with •) in ${lang}` },
              },
              required: ['common_friendly', 'serious_friendly', 'self_care'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'format_side_effects' } },
      }),
    });

    if (!response.ok) {
      console.error('AI humanize error:', response.status);
      return { commonHumanized: commonText, seriousHumanized: seriousText, selfCareTips: null };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return { commonHumanized: commonText, seriousHumanized: seriousText, selfCareTips: null };

    const result = JSON.parse(toolCall.function.arguments);
    return {
      commonHumanized: result.common_friendly || commonText,
      seriousHumanized: result.serious_friendly || seriousText,
      selfCareTips: result.self_care || null,
    };
  } catch (e) {
    console.error('Humanize failed:', e);
    return { commonHumanized: commonText, seriousHumanized: seriousText, selfCareTips: null };
  }
}

async function translateContent(textsMap: Record<string, string | null>, targetLang: string): Promise<Record<string, string | null>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured, skipping translation');
    return textsMap;
  }

  const langNames: Record<string, string> = { fr: 'French', de: 'German', en: 'English' };
  const langName = langNames[targetLang];
  if (!langName) return textsMap;

  // Filter out null/empty values
  const toTranslate: Record<string, string> = {};
  for (const [key, val] of Object.entries(textsMap)) {
    if (val && val.trim()) toTranslate[key] = val;
  }

  if (Object.keys(toTranslate).length === 0) return textsMap;

  const prompt = `You are a medical translator. Translate the following Dutch medical patient information texts to clear, correct ${langName} suitable for patients. Keep medical terms accurate. Preserve bullet point format (lines starting with •). Do NOT add any explanation, just return the translations.

Return a JSON object with the same keys, each value being the ${langName} translation.

Texts to translate:
${JSON.stringify(toTranslate, null, 2)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are a professional medical translator specializing in Dutch to ${langName} translation for oncology patient information. Always return valid JSON only, no markdown formatting.` },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI translation error:', response.status, await response.text());
      return textsMap;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return textsMap;

    // Parse the JSON response, stripping markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const translated = JSON.parse(cleaned);

    // Merge back
    const result: Record<string, string | null> = { ...textsMap };
    for (const key of Object.keys(toTranslate)) {
      if (translated[key]) result[key] = translated[key];
    }
    return result;
  } catch (e) {
    console.error('Translation failed:', e);
    return textsMap;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authentication check - require a valid user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = authClient;

    // Fetch user's hospital for branding
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let hospitalName = 'OncoInfo';
    let hospitalColor = '#6b2d5b';
    let hospitalLogoUrl: string | null = null;

    if (userProfile?.hospital_id) {
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('name, logo_url, branding')
        .eq('id', userProfile.hospital_id)
        .maybeSingle();
      if (hospital) {
        hospitalName = hospital.name;
        hospitalColor = (hospital.branding as any)?.primary_color || '#6b2d5b';
        hospitalLogoUrl = (hospital.branding as any)?.patient_folder_logo_url || hospital.logo_url;
      }
    }

    // Fetch hospital doctors from hospital_doctors + profiles
    let doctorsList: string[] = [];
    if (userProfile?.hospital_id) {
      const { data: doctors } = await supabase
        .from('hospital_doctors')
        .select('name, staff_type')
        .eq('hospital_id', userProfile.hospital_id)
        .eq('is_active', true)
        .order('display_order');
      if (doctors) {
        doctorsList = doctors
          .filter((d: any) => d.staff_type === 'doctor' || d.staff_type === 'arts')
          .map((d: any) => d.name);
      }

      // Also fetch physicians from profiles as supplement
      const { data: profileDoctors } = await supabase
        .from('profiles')
        .select('first_name, last_name, function')
        .eq('hospital_id', userProfile.hospital_id);
      if (profileDoctors) {
        const existingNames = new Set(doctorsList.map(n => n.toLowerCase()));
        profileDoctors
          .filter((p: any) => p.function === 'arts' && p.first_name && p.last_name)
          .forEach((p: any) => {
            const fullName = `${p.first_name} ${p.last_name}`;
            if (!existingNames.has(fullName.toLowerCase())) {
              doctorsList.push(fullName);
              existingNames.add(fullName.toLowerCase());
            }
          });
      }
    }
 
    const { drug_id, include_dosing = true, include_side_effects = true, physician_name = '', nurse_name = '', language = 'nl', phone_number = '', folder_mode = 'compact', premedicatie = [] } = await req.json();
 
    if (!drug_id) {
      return new Response(
        JSON.stringify({ error: 'drug_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: drug, error: drugError } = await supabase
      .from('drugs')
      .select('*')
      .eq('id', drug_id)
      .single();

    if (drugError || !drug) {
      return new Response(
        JSON.stringify({ error: 'Drug not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: customContent } = await supabase
      .from('patient_folder_content')
      .select('*')
      .eq('drug_id', drug_id)
      .single();

    // Fetch logo - use hospital logo or fallback
    let logoDataUri = '';
    const APP_URL = 'https://oncoinfo.lovable.app';
    const logoSourceUrl = hospitalLogoUrl
      ? (hospitalLogoUrl.startsWith('http') ? hospitalLogoUrl
        : hospitalLogoUrl.startsWith('/') ? `${APP_URL}${hospitalLogoUrl}`
        : `${supabaseUrl}/storage/v1/object/public/public-assets/${hospitalLogoUrl}`)
      : `${APP_URL}/images/logo-rzt.png`;
    try {
      const logoResponse = await fetch(logoSourceUrl);
      if (logoResponse.ok) {
        const contentType = logoResponse.headers.get('content-type') || 'image/png';
        if (contentType.startsWith('image/')) {
          const logoBuffer = new Uint8Array(await logoResponse.arrayBuffer());
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < logoBuffer.length; i += chunkSize) {
            const chunk = logoBuffer.subarray(i, Math.min(i + chunkSize, logoBuffer.length));
            for (let j = 0; j < chunk.length; j++) {
              binary += String.fromCharCode(chunk[j]);
            }
          }
          logoDataUri = `data:${contentType};base64,${btoa(binary)}`;
        }
      }
    } catch (e) {
      console.error('Could not fetch logo:', e);
    }

    // Prepare content texts — compact mode limits content to fit 1 page
    const isCompact = folder_mode === 'compact';
    const maxIndications = isCompact ? 3 : 6;
    const maxCommonSideEffects = isCompact ? 4 : 8;
    const maxSeriousSideEffects = isCompact ? 2 : 5;
    const maxCounselingPoints = isCompact ? 3 : 6;
    const maxContraindications = isCompact ? 3 : 6;
    const maxMonitoring = isCompact ? 3 : 6;

    let introductionText = customContent?.introduction || drug.mechanism_of_action || null;
    let usageText = customContent?.usage_info || 
      (drug.approved_indications?.length > 0 
        ? drug.approved_indications.slice(0, maxIndications).map((ind: string) => `• ${ind}`).join('\n')
        : null);
    let dosingText = customContent?.dosing_info || null;
    let contraindicationsText = customContent?.contraindications ||
      (drug.contraindications?.length > 0
        ? drug.contraindications.slice(0, maxContraindications).map((c: string) => `• ${c}`).join('\n')
        : null);
    let sideEffectsCommonText = customContent?.side_effects_common ||
      (drug.side_effects?.common?.length > 0
        ? drug.side_effects.common.slice(0, maxCommonSideEffects).map((e: string) => `• ${e}`).join('\n')
        : null);
    let sideEffectsSeriousText = customContent?.side_effects_serious ||
      (drug.side_effects?.serious?.length > 0
        ? drug.side_effects.serious.slice(0, maxSeriousSideEffects).map((e: string) => `• ${e}`).join('\n')
        : null);
    let tipsText = customContent?.tips ||
      (drug.patient_counseling_points?.length > 0
        ? drug.patient_counseling_points.slice(0, maxCounselingPoints).map((p: string) => `• ${p}`).join('\n')
        : null);
    let monitoringText = customContent?.monitoring ||
      (drug.monitoring_requirements?.length > 0
        ? drug.monitoring_requirements.slice(0, maxMonitoring).map((r: string) => `• ${r}`).join('\n')
        : null);

    // Build dosing text from structured data if no custom content
    let dosingStructured = '';
    if (!dosingText && drug.dosing_info) {
      const di = drug.dosing_info;
      const parts: string[] = [];
      // Support complex multi-phase schemas (e.g. KEYNOTE-522)
      if (di.neoadjuvant_phase1) parts.push(`• ${di.neoadjuvant_phase1}${di.neoadjuvant_phase1_duration ? ` (${di.neoadjuvant_phase1_duration})` : ''}`);
      if (di.neoadjuvant_phase2) parts.push(`• ${di.neoadjuvant_phase2}${di.neoadjuvant_phase2_duration ? ` (${di.neoadjuvant_phase2_duration})` : ''}`);
      if (di.adjuvant) parts.push(`• ${di.adjuvant}${di.adjuvant_duration ? ` (${di.adjuvant_duration})` : ''}`);
      // Simple schemas
      if (parts.length === 0) {
        if (di.frequency) parts.push(`• ${di.frequency}`);
        if (drug.cycle_length_days) parts.push(`• Cyclus: ${drug.cycle_length_days} dagen`);
        if (di.duration) parts.push(`• Duur: ${di.duration}`);
      }
      // Common regimens as fallback
      if (parts.length === 0 && drug.common_regimens?.length > 0) {
        drug.common_regimens.forEach((r: string) => parts.push(`• ${r}`));
      }
      if (di.notes) parts.push(`• ${di.notes}`);
      // Add instruction for oral medications (as first item, bold)
      if (drug.administration_route?.toLowerCase() === 'oraal') {
        const followMsg: Record<string, string> = {
          nl: '<strong>Volg altijd de instructies van uw behandelend arts.</strong>',
          fr: '<strong>Suivez toujours les instructions de votre médecin traitant.</strong>',
          de: '<strong>Befolgen Sie immer die Anweisungen Ihres behandelnden Arztes.</strong>',
          en: '<strong>Always follow your treating physician\'s instructions.</strong>',
        };
        parts.unshift(`• ${followMsg[language] || followMsg['nl']}`);
      }
      dosingStructured = parts.join('\n');
    }

    // Humanize side effects with AI (skip if custom self_care_tips provided)
    let selfCareTips: string | null = customContent?.self_care_tips || null;
    if (include_side_effects && (sideEffectsCommonText || sideEffectsSeriousText)) {
      console.log('Humanizing side effects...');
      const humanized = await humanizeSideEffects(
        sideEffectsCommonText, sideEffectsSeriousText, drug.generic_name, language
      );
      sideEffectsCommonText = humanized.commonHumanized;
      sideEffectsSeriousText = humanized.seriousHumanized;
      if (!selfCareTips) {
        selfCareTips = humanized.selfCareTips;
      }
      console.log('Side effects humanized');
    }

    // Translate content if not Dutch (skip side effects — already generated in target language by humanize)
    if (language !== 'nl') {
      const textsToTranslate: Record<string, string | null> = {
        introduction: introductionText,
        usage: usageText,
        dosing: dosingText || dosingStructured || null,
        contraindications: contraindicationsText,
        tips: tipsText,
        monitoring: monitoringText,
      };

      // Also translate premedicatie timing texts
      const premTextsToTranslate: Record<string, string | null> = {};
      if (premedicatie && premedicatie.length > 0) {
        premedicatie.forEach((item: string, idx: number) => {
          premTextsToTranslate[`prem_${idx}`] = item;
        });
      }

      console.log(`Translating content to ${language}...`);
      const [translated, translatedPrem] = await Promise.all([
        translateContent(textsToTranslate, language),
        Object.keys(premTextsToTranslate).length > 0 
          ? translateContent(premTextsToTranslate, language) 
          : Promise.resolve({} as Record<string, string | null>),
      ]);
      
      introductionText = translated.introduction ?? introductionText;
      usageText = translated.usage ?? usageText;
      if (dosingText) {
        dosingText = translated.dosing ?? dosingText;
      } else if (dosingStructured) {
        dosingStructured = translated.dosing ?? dosingStructured;
      }
      contraindicationsText = translated.contraindications ?? contraindicationsText;
      tipsText = translated.tips ?? tipsText;
      monitoringText = translated.monitoring ?? monitoringText;

      // Apply translated premedicatie items
      if (premedicatie && premedicatie.length > 0) {
        for (let idx = 0; idx < premedicatie.length; idx++) {
          if (translatedPrem[`prem_${idx}`]) {
            premedicatie[idx] = translatedPrem[`prem_${idx}`];
          }
        }
      }

      console.log('Translation complete');
    }

    const html = generatePatientInfoHtml(
      drug, include_dosing, include_side_effects, logoDataUri, 
      physician_name, nurse_name, language,
      introductionText, usageText, dosingText, dosingStructured,
      contraindicationsText, sideEffectsCommonText, sideEffectsSeriousText, 
      tipsText, monitoringText, phone_number, selfCareTips,
      hospitalName, hospitalColor, doctorsList, folder_mode, premedicatie
    );

    return new Response(
      JSON.stringify({ html, drug_name: drug.generic_name, brand_names: drug.brand_names, language }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePatientInfoHtml(
  drug: any, 
  includeDosing: boolean, 
  includeSideEffects: boolean, 
  logoUrl: string,
  physicianName: string,
  nurseName: string,
  language: string,
  introductionText: string | null,
  usageText: string | null,
  dosingText: string | null,
  dosingStructured: string,
  contraindicationsText: string | null,
  sideEffectsCommonText: string | null,
  sideEffectsSeriousText: string | null,
  tipsText: string | null,
  monitoringText: string | null,
  phoneNumber: string = '',
  selfCareTips: string | null = null,
  hospitalName: string = 'RZ Tienen',
  hospitalColor: string = '#6b2d5b',
  doctorsList: string[] = [],
  folderMode: string = 'compact',
  premedicatieItems: string[] = [],
): string {
  const isCompact = folderMode === 'compact';
  const allLabels: Record<string, any> = {
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
      pageTitle: 'Patiëntinformatie',
    },
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
      pageTitle: 'Information patient',
    },
    de: {
      title: 'Informationen für Patienten',
      whatIs: `Was ist ${drug.generic_name}?`,
      usedFor: 'Wofür wird es verwendet?',
      howGiven: 'Wie wird es verabreicht?',
      whenNot: 'Wann nicht anwenden',
      sideEffects: 'Mögliche Nebenwirkungen',
      commonSE: 'Häufig',
      seriousSE: 'Schwerwiegend - Kontaktieren Sie sofort Ihren Arzt',
      selfCare: 'Was können Sie selbst tun?',
      tips: 'Wichtige Hinweise',
      monitoring: 'Kontrollen',
      premedicatie: 'Begleitmedikation',
      contact: 'Kontakt',
      physician: 'Arzt',
      nurse: 'Pflegekraft',
      phone: 'Tel',
      footer: `${hospitalName} - Onkologie | ${new Date().toLocaleDateString('de-DE')} | Diese Information ergänzt das Gespräch mit Ihrem Arzt.`,
      pageTitle: 'Patienteninformation',
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
      selfCare: 'What can you do yourself?',
      tips: 'Important tips',
      monitoring: 'Check-ups',
      premedicatie: 'Supportive medication',
      contact: 'Contact',
      physician: 'Physician',
      nurse: 'Nurse',
      phone: 'Phone',
      footer: `${hospitalName} - Oncology | ${new Date().toLocaleDateString('en-GB')} | This information supplements the conversation with your doctor.`,
      pageTitle: 'Patient information',
    },
  };

  const labels = allLabels[language] || allLabels.nl;

  const brandNamesText = drug.brand_names?.length > 0 
    ? ` (${drug.brand_names.join(', ')})` 
    : '';

  const formatAsList = (text: string | null) => {
    if (!text) return '';
    const items = text.split('\n').filter(l => l.trim());
    if (items.length === 0) return '';
    return `<ul>${items.map(line => {
      const trimmed = line.trim();
      const content = trimmed.startsWith('•') ? trimmed.substring(1).trim() : trimmed;
      return `<li>${content}</li>`;
    }).join('')}</ul>`;
  };

  const htmlLang = language;

  // Build premedicatie page HTML separately to avoid template literal nesting issues
  let premedicatiePageHtml = '';
  if (premedicatieItems && premedicatieItems.length > 0) {
    const schemaTitle = language === 'fr' ? 'Schéma des médicaments de soutien' : language === 'de' ? 'Schema Begleitmedikation' : language === 'en' ? 'Supportive medication schedule' : 'Schema ondersteunende medicatie';
    const disclaimerTitle = language === 'fr' ? 'Avis important' : language === 'de' ? 'Wichtiger Hinweis' : language === 'en' ? 'Important notice' : 'Belangrijke mededeling';
    const disclaimerText = language === 'fr' ? 'Ce document est uniquement destiné à des fins informatives et ne constitue pas un dispositif médical (MDR 2017/745).' : language === 'de' ? 'Dieses Dokument dient ausschließlich zu Informationszwecken und ist kein Medizinprodukt (MDR 2017/745).' : language === 'en' ? 'This document is for informational purposes only and is not a medical device (MDR 2017/745).' : 'Dit document is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel (MDR 2017/745).';

    const timelineItemsHtml = premedicatieItems.map((item: string) => {
      const match = item.match(/^(.+?)\s*\((\w+)\)\s*[–\-]\s*(.+)$/);
      const name = match ? match[1].trim() : item;
      const route = match ? match[2] : '';
      const timing = match ? match[3].trim() : '';
      return '<div class="timeline-item">' +
        '<div class="timeline-dot"></div>' +
        '<div class="timeline-content">' +
        '<h3>' + name + '</h3>' +
        (route ? '<div><span class="timeline-route">' + route + '</span></div>' : '') +
        (timing ? '<div class="timeline-timing">⏱ <strong>' + timing + '</strong></div>' : '') +
        '</div></div>';
    }).join('');

    premedicatiePageHtml = '<!-- Premedicatie Page -->' +
      '<div class="page-break" style="padding: 12mm;">' +
      '<div class="logo-header"><div class="logo-name">' +
      '<img src="' + logoUrl + '" alt="' + hospitalName + ' Logo" />' +
      '<span class="hospital-name">' + hospitalName + '</span></div>' +
      '<div class="header-title"><h1>' + labels.premedicatie + '</h1>' +
      '<p class="subtitle">' + drug.generic_name + brandNamesText + '</p></div></div>' +
      '<div style="margin-top: 24px;">' +
      '<h2 style="color: ' + hospitalColor + '; font-size: 18px; margin-bottom: 20px; padding-bottom: 6px; border-bottom: 2px solid ' + hospitalColor + ';">' + schemaTitle + '</h2>' +
      '<div class="timeline"><div class="timeline-line"></div>' +
      timelineItemsHtml +
      '</div></div>' +
      '<div style="margin-top: 40px; padding: 10px 12px; border: 1.5px solid #cc0000; border-radius: 6px; background: #fff5f5;">' +
      '<p style="font-weight: 700; color: #cc0000; font-size: 9px; margin-bottom: 2px;">⚠ ' + disclaimerTitle + '</p>' +
      '<p style="font-size: 8px; color: #444; line-height: 1.3;">' + disclaimerText + '</p></div>' +
      '<div class="footer"><p>' + labels.footer + '</p></div></div>';
  }

  return `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.pageTitle} - ${drug.generic_name}</title>
  <style>
    @page { size: A4; margin: ${isCompact ? '10mm' : '12mm'}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: ${isCompact ? '11px' : '14px'}; line-height: ${isCompact ? '1.35' : '1.5'}; color: #1a1a1a;
      width: 210mm; margin: 0 auto; padding: ${isCompact ? '10mm' : '12mm'};
      background: white;
      ${isCompact ? 'max-height: 277mm; overflow: hidden;' : ''}
    }
    .logo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isCompact ? '6px' : '12px'}; padding-bottom: ${isCompact ? '5px' : '10px'}; border-bottom: 2px solid ${hospitalColor}; }
    .logo-name { display: flex; align-items: center; gap: 10px; }
    .logo-header img { max-height: ${isCompact ? '40px' : '55px'}; max-width: 200px; width: auto; height: auto; object-fit: contain; }
    .hospital-name { font-size: ${isCompact ? '16px' : '20px'}; font-weight: 800; color: ${hospitalColor}; }
    .header-title { text-align: right; }
    .header-title h1 { color: ${hospitalColor}; font-size: ${isCompact ? '17px' : '22px'}; margin-bottom: 2px; }
    .header-title .subtitle { color: #666; font-size: ${isCompact ? '11px' : '13px'}; }
    .content { display: grid; grid-template-columns: 1fr 1fr; gap: ${isCompact ? '8px' : '14px'}; margin-top: ${isCompact ? '8px' : '14px'}; }
    .section { margin-bottom: ${isCompact ? '4px' : '10px'}; }
    .section h2 { color: ${hospitalColor}; font-size: ${isCompact ? '12px' : '15px'}; margin-bottom: ${isCompact ? '3px' : '6px'}; padding-bottom: 2px; border-bottom: 1px solid #e0e0e0; }
    .section p { margin-bottom: ${isCompact ? '2px' : '4px'}; color: #333; font-size: ${isCompact ? '10px' : '13px'}; }
    .section ul { margin-left: 14px; margin-bottom: ${isCompact ? '3px' : '6px'}; }
    .section li { margin-bottom: ${isCompact ? '1px' : '3px'}; color: #333; font-size: ${isCompact ? '10px' : '13px'}; }
    .warning-box { background: #fff8e6; border-left: 3px solid #e87722; padding: ${isCompact ? '4px 6px' : '8px 10px'}; margin: ${isCompact ? '3px 0' : '6px 0'}; border-radius: 0 3px 3px 0; }
    .warning-box h3 { color: #cc7a00; font-size: ${isCompact ? '10px' : '13px'}; margin-bottom: ${isCompact ? '2px' : '4px'}; }
    .danger-box { background: #ffe6e6; border-left: 3px solid #cc0000; padding: ${isCompact ? '4px 6px' : '8px 10px'}; margin: ${isCompact ? '3px 0' : '6px 0'}; border-radius: 0 3px 3px 0; }
    .danger-box h3 { color: #cc0000; font-size: ${isCompact ? '10px' : '13px'}; margin-bottom: ${isCompact ? '2px' : '4px'}; }
    .info-box { background: #f5e6f0; border-left: 3px solid ${hospitalColor}; padding: ${isCompact ? '4px 6px' : '8px 10px'}; margin: ${isCompact ? '3px 0' : '6px 0'}; border-radius: 0 3px 3px 0; }
    .selfcare-box { background: #e8f5e9; border-left: 3px solid #388e3c; padding: ${isCompact ? '4px 6px' : '8px 10px'}; margin: ${isCompact ? '3px 0' : '6px 0'}; border-radius: 0 3px 3px 0; }
    .selfcare-box h3 { color: #2e7d32; font-size: ${isCompact ? '10px' : '13px'}; margin-bottom: ${isCompact ? '2px' : '4px'}; }
    .full-width { grid-column: 1 / -1; }
    .contact-section { background: #f5f5f5; padding: ${isCompact ? '5px 8px' : '10px 12px'}; border-radius: 4px; margin-top: ${isCompact ? '6px' : '12px'}; font-size: ${isCompact ? '10px' : '12px'}; }
    .contact-section h2 { font-size: ${isCompact ? '11px' : '14px'}; margin-bottom: ${isCompact ? '4px' : '8px'}; color: ${hospitalColor}; }
    .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: ${isCompact ? '6px' : '10px'}; }
    .contact-grid p { margin: 0; white-space: nowrap; }
    .footer { margin-top: ${isCompact ? '4px' : '12px'}; padding-top: ${isCompact ? '4px' : '8px'}; border-top: 1px solid #e0e0e0; font-size: ${isCompact ? '8px' : '11px'}; color: #666; text-align: center; }
    .page-container { position: relative; min-height: 273mm; padding-bottom: 24mm; }
    .page-bottom { position: absolute; bottom: 0; left: 0; right: 0; }
    .page-break { page-break-before: always; break-before: page; padding-top: 12mm; }
    /* Timeline styles */
    .timeline { position: relative; margin: 20px 0; padding-left: 0; }
    .timeline-line { position: absolute; left: 28px; top: 0; bottom: 0; width: 3px; background: ${hospitalColor}; border-radius: 2px; }
    .timeline-item { position: relative; display: flex; align-items: flex-start; margin-bottom: 18px; padding-left: 60px; }
    .timeline-dot { position: absolute; left: 20px; top: 4px; width: 20px; height: 20px; border-radius: 50%; background: ${hospitalColor}; border: 3px solid white; box-shadow: 0 0 0 2px ${hospitalColor}; z-index: 1; }
    .timeline-content { background: #f8f5f7; border: 1px solid #e8dce5; border-radius: 8px; padding: 12px 16px; flex: 1; }
    .timeline-content h3 { font-size: 15px; color: ${hospitalColor}; margin-bottom: 4px; font-weight: 700; }
    .timeline-route { display: inline-block; background: ${hospitalColor}; color: white; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-right: 8px; }
    .timeline-timing { font-size: 13px; color: #555; margin-top: 4px; }
    .timeline-timing strong { color: #333; }
    @media print {
      body { width: auto; min-height: auto; padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; ${isCompact ? 'max-height: none; overflow: visible;' : ''} }
      .logo-header img { max-height: ${isCompact ? '40px' : '55px'} !important; max-width: 200px !important; }
      .page-break { page-break-before: always; break-before: page; }
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <div class="logo-name">
      <img src="${logoUrl}" alt="${hospitalName} Logo" />
      <span class="hospital-name">${hospitalName}</span>
    </div>
    <div class="header-title">
      <h1>${drug.generic_name}${brandNamesText}</h1>
      <p class="subtitle">${labels.title}</p>
    </div>
  </div>

  <div class="page-container">
  <div class="content">
    ${introductionText ? `
    <div class="section">
      <h2>${labels.whatIs}</h2>
      <p>${introductionText}</p>
    </div>
    ` : ''}

    ${usageText ? `
    <div class="section">
      <h2>${labels.usedFor}</h2>
      ${formatAsList(usageText)}
    </div>
    ` : ''}

    ${includeDosing && (dosingText || dosingStructured || drug.dosing_info || drug.common_regimens?.length > 0) ? `
    <div class="section">
      <h2>${labels.howGiven}</h2>
      ${dosingText ? formatAsList(dosingText) 
        : dosingStructured ? formatAsList(dosingStructured)
        : drug.common_regimens?.length > 0 ? formatAsList(drug.common_regimens.map((r: string) => `• ${r}`).join('\n'))
        : ''}
    </div>
    ` : ''}

    ${premedicatieItems && premedicatieItems.length > 0 ? `
    <div class="section">
      <h2>${labels.premedicatie}</h2>
      <p style="font-size: ${isCompact ? '9px' : '12px'}; color: #666; font-style: italic;">${language === 'fr' ? 'Voir le schéma ci-joint' : language === 'de' ? 'Siehe beigefügtes Schema' : language === 'en' ? 'See attached schedule' : 'Zie bijgevoegd schema'}</p>
    </div>
    ` : ''}

    ${contraindicationsText ? `
    <div class="section">
      <h2>${labels.whenNot}</h2>
      ${formatAsList(contraindicationsText)}
    </div>
    ` : ''}

    ${includeSideEffects && (sideEffectsCommonText || sideEffectsSeriousText) ? `
    <div class="section full-width">
      <h2>${labels.sideEffects}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${sideEffectsCommonText ? `
        <div class="warning-box">
          <h3>${labels.commonSE}</h3>
          ${formatAsList(sideEffectsCommonText)}
        </div>
        ` : ''}
        ${sideEffectsSeriousText ? `
        <div class="danger-box">
          <h3>${labels.seriousSE}</h3>
          ${formatAsList(sideEffectsSeriousText)}
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${selfCareTips ? `
    <div class="section full-width">
      <h2>${labels.selfCare}</h2>
      <div class="selfcare-box">
        ${formatAsList(selfCareTips)}
      </div>
    </div>
    ` : ''}

    ${tipsText ? `
    <div class="section">
      <h2>${labels.tips}</h2>
      <div class="info-box">
        ${formatAsList(tipsText)}
      </div>
    </div>
    ` : ''}

    ${!isCompact && monitoringText ? `
    <div class="section">
      <h2>${labels.monitoring}</h2>
      ${formatAsList(monitoringText)}
    </div>
    ` : ''}
  </div> <!-- end content grid -->

  <div class="contact-section full-width">
    <h2>${labels.contact}</h2>
    <div class="contact-grid">
      <p><strong>${labels.physician}:</strong> ${physicianName || (doctorsList.length > 0 ? doctorsList[0] : '_________________')}</p>
      <p><strong>${labels.nurse}:</strong> ${nurseName || '_________________'}</p>
      <p><strong>${labels.phone}:</strong> ${phoneNumber || '_________________'}</p>
    </div>
  </div>

  <div class="page-bottom">
    <div style="padding: ${isCompact ? '5px 8px' : '10px 12px'}; border: 1.5px solid #cc0000; border-radius: 6px; background: #fff5f5;">
      <p style="font-weight: 700; color: #cc0000; font-size: ${isCompact ? '7px' : '9px'}; margin-bottom: 2px;">⚠ ${language === 'fr' ? 'Avis important' : language === 'de' ? 'Wichtiger Hinweis' : language === 'en' ? 'Important notice' : 'Belangrijke mededeling'}</p>
      <p style="font-size: ${isCompact ? '6.5px' : '8px'}; color: #444; line-height: 1.3;">${language === 'fr' ? 'Ce document est uniquement destiné à des fins informatives et ne constitue pas un dispositif médical (MDR 2017/745). Son contenu peut contenir des erreurs et ne doit pas servir de base unique pour des décisions cliniques. Consultez toujours votre médecin ou pharmacien.' : language === 'de' ? 'Dieses Dokument dient ausschließlich zu Informationszwecken und ist kein Medizinprodukt (MDR 2017/745). Der Inhalt kann Fehler enthalten und darf nicht als alleinige Grundlage für klinische Entscheidungen verwendet werden. Konsultieren Sie immer Ihren Arzt oder Apotheker.' : language === 'en' ? 'This document is for informational purposes only and is not a medical device (MDR 2017/745). Its content may contain errors and should not be used as the sole basis for clinical decisions. Always consult your physician or pharmacist.' : 'Dit document is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel (MDR 2017/745). De inhoud kan fouten bevatten en mag niet als enige basis voor klinische beslissingen dienen. Raadpleeg altijd uw behandelend arts of apotheker.'}</p>
    </div>
    <div class="footer">
      <p>${labels.footer}</p>
    </div>
  </div>
  </div> <!-- end page-container -->

  ${premedicatiePageHtml}

</body>
</html>
  `.trim();
}
