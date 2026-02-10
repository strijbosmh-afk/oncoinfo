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

  const lang = language === 'fr' ? 'French' : 'Dutch';

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

async function translateToFrench(textsMap: Record<string, string | null>): Promise<Record<string, string | null>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured, skipping translation');
    return textsMap;
  }

  // Filter out null/empty values
  const toTranslate: Record<string, string> = {};
  for (const [key, val] of Object.entries(textsMap)) {
    if (val && val.trim()) toTranslate[key] = val;
  }

  if (Object.keys(toTranslate).length === 0) return textsMap;

  const prompt = `You are a medical translator. Translate the following Dutch medical patient information texts to clear, correct French suitable for patients. Keep medical terms accurate. Preserve bullet point format (lines starting with •). Do NOT add any explanation, just return the translations.

Return a JSON object with the same keys, each value being the French translation.

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
          { role: 'system', content: 'You are a professional medical translator specializing in Dutch to French translation for oncology patient information. Always return valid JSON only, no markdown formatting.' },
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
 
    const { drug_id, include_dosing = true, include_side_effects = true, physician_name = '', nurse_name = '', language = 'nl', phone_number = '' } = await req.json();
 
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

    // Fetch logo
    let logoDataUri = '';
    const supabaseStorageLogoUrl = `${supabaseUrl}/storage/v1/object/public/public-assets/logo-rzt.png`;
    try {
      const logoResponse = await fetch(supabaseStorageLogoUrl);
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
          console.log(`Logo fetched successfully, size: ${logoBuffer.length} bytes`);
        }
      }
    } catch (e) {
      console.error('Could not fetch logo:', e);
    }

    // Prepare content texts
    const maxIndications = 4;
    const maxCommonSideEffects = 5;
    const maxSeriousSideEffects = 3;
    const maxCounselingPoints = 4;
    const maxContraindications = 4;
    const maxMonitoring = 4;

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
      const parts: string[] = [];
      if (drug.dosing_info.standard_dose) parts.push(`Dosering: ${drug.dosing_info.standard_dose}`);
      if (drug.dosing_info.frequency) parts.push(`Frequentie: ${drug.dosing_info.frequency}`);
      if (drug.dosing_info.duration) parts.push(`Duur: ${drug.dosing_info.duration}`);
      if (drug.cycle_length_days) parts.push(`Cyclus: ${drug.cycle_length_days} dagen`);
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

    // Translate content if French (skip side effects — already generated in French by humanize)
    if (language === 'fr') {
      const textsToTranslate: Record<string, string | null> = {
        introduction: introductionText,
        usage: usageText,
        dosing: dosingText || dosingStructured || null,
        contraindications: contraindicationsText,
        tips: tipsText,
        monitoring: monitoringText,
      };

      console.log('Translating content to French...');
      const translated = await translateToFrench(textsToTranslate);
      
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
      console.log('Translation complete');
    }

    const html = generatePatientInfoHtml(
      drug, include_dosing, include_side_effects, logoDataUri, 
      physician_name, nurse_name, language,
      introductionText, usageText, dosingText, dosingStructured,
      contraindicationsText, sideEffectsCommonText, sideEffectsSeriousText, 
      tipsText, monitoringText, phone_number, selfCareTips
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
): string {
  const isFr = language === 'fr';
  
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
  };

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

  const htmlLang = isFr ? 'fr' : 'nl';

  return `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isFr ? 'Information patient' : 'Patiëntinformatie'} - ${drug.generic_name}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px; line-height: 1.5; color: #1a1a1a;
      width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm;
      background: white; overflow: auto;
    }
    .logo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #6b2d5b; }
    .logo-header img { max-height: 50px; width: auto; }
    .header-title { text-align: right; }
    .header-title h1 { color: #6b2d5b; font-size: 22px; margin-bottom: 4px; }
    .header-title .subtitle { color: #666; font-size: 13px; }
    .content { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
    .section { margin-bottom: 10px; }
    .section h2 { color: #6b2d5b; font-size: 15px; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1px solid #e0e0e0; }
    .section p { margin-bottom: 4px; color: #333; font-size: 13px; }
    .section ul { margin-left: 14px; margin-bottom: 6px; }
    .section li { margin-bottom: 3px; color: #333; font-size: 13px; }
    .warning-box { background: #fff8e6; border-left: 3px solid #e87722; padding: 8px 10px; margin: 6px 0; border-radius: 0 3px 3px 0; }
    .warning-box h3 { color: #cc7a00; font-size: 13px; margin-bottom: 4px; }
    .danger-box { background: #ffe6e6; border-left: 3px solid #cc0000; padding: 8px 10px; margin: 6px 0; border-radius: 0 3px 3px 0; }
    .danger-box h3 { color: #cc0000; font-size: 13px; margin-bottom: 4px; }
    .info-box { background: #f5e6f0; border-left: 3px solid #6b2d5b; padding: 8px 10px; margin: 6px 0; border-radius: 0 3px 3px 0; }
    .selfcare-box { background: #e8f5e9; border-left: 3px solid #388e3c; padding: 8px 10px; margin: 6px 0; border-radius: 0 3px 3px 0; }
    .selfcare-box h3 { color: #2e7d32; font-size: 13px; margin-bottom: 4px; }
    .full-width { grid-column: 1 / -1; }
    .contact-section { background: #f5f5f5; padding: 10px 12px; border-radius: 4px; margin-top: 12px; font-size: 12px; }
    .contact-section h2 { font-size: 14px; margin-bottom: 8px; color: #6b2d5b; }
    .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .contact-grid p { margin: 0; white-space: nowrap; }
    .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #666; text-align: center; }
    @media print {
      body { width: auto; min-height: auto; padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .logo-header img { max-height: 50px !important; }
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="${logoUrl}" alt="RZ Tienen Logo" />
    <div class="header-title">
      <h1>${drug.generic_name}${brandNamesText}</h1>
      <p class="subtitle">${labels.title}</p>
    </div>
  </div>

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

    ${includeDosing && (dosingText || dosingStructured || drug.dosing_info) ? `
    <div class="section">
      <h2>${labels.howGiven}</h2>
      ${dosingText ? `<p>${dosingText.replace(/\n/g, '<br>')}</p>` 
        : dosingStructured ? `<p>${dosingStructured.replace(/\n/g, '<br>')}</p>`
        : ''}
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
          <p style="font-size: 13px;">${sideEffectsCommonText.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}
        ${sideEffectsSeriousText ? `
        <div class="danger-box">
          <h3>${labels.seriousSE}</h3>
          <p style="font-size: 13px;">${sideEffectsSeriousText.replace(/\n/g, '<br>')}</p>
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

    ${monitoringText ? `
    <div class="section">
      <h2>${labels.monitoring}</h2>
      ${formatAsList(monitoringText)}
    </div>
    ` : ''}
  </div>

  <div class="contact-section full-width">
    <h2>${labels.contact}</h2>
    <div class="contact-grid">
      <p><strong>${labels.physician}:</strong> ${physicianName || '_________________'}</p>
      <p><strong>${labels.nurse}:</strong> ${nurseName || '_________________'}</p>
      <p><strong>${labels.phone}:</strong> ${phoneNumber || '016 80 90 11'}</p>
    </div>
  </div>

  <div class="footer">
    <p>${labels.footer}</p>
  </div>
</body>
</html>
  `.trim();
}
