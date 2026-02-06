import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // No authentication required - this generates public drug information
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
    const { drug_id, include_dosing = true, include_side_effects = true, physician_name = '', nurse_name = '' } = await req.json();
 
    if (!drug_id) {
      return new Response(
        JSON.stringify({ error: 'drug_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch drug data
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

    // Fetch custom folder content if exists
    const { data: customContent } = await supabase
      .from('patient_folder_content')
      .select('*')
      .eq('drug_id', drug_id)
      .single();

    // Fetch logo as base64 so it works in preview and print without needing publish
    let logoDataUri = '';
    try {
      const logoResponse = await fetch('https://uroinfo.lovable.app/images/logo-rzt.png');
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
        logoDataUri = `data:image/png;base64,${base64}`;
      }
    } catch (e) {
      console.error('Could not fetch logo:', e);
    }
    
    // Generate patient-friendly HTML with optional custom content
    const html = generatePatientInfoHtml(drug, include_dosing, include_side_effects, logoDataUri, customContent, physician_name, nurse_name);

    return new Response(
      JSON.stringify({ 
        html,
        drug_name: drug.generic_name,
        brand_names: drug.brand_names,
        custom_content: customContent
      }),
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

interface CustomContent {
  introduction?: string;
  usage_info?: string;
  dosing_info?: string;
  contraindications?: string;
  side_effects_common?: string;
  side_effects_serious?: string;
  tips?: string;
  monitoring?: string;
}

function generatePatientInfoHtml(
  drug: any, 
  includeDosing: boolean, 
  includeSideEffects: boolean, 
  logoUrl: string,
  customContent?: CustomContent | null,
  physicianName?: string,
  nurseName?: string
): string {
  const brandNamesText = drug.brand_names?.length > 0 
    ? ` (${drug.brand_names.join(', ')})` 
    : '';

  // Limit items to fit A4
  const maxIndications = 4;
  const maxCommonSideEffects = 5;
  const maxSeriousSideEffects = 3;
  const maxCounselingPoints = 4;
  const maxContraindications = 4;
  const maxMonitoring = 4;

  // Use custom content if available, otherwise use drug data
  const introductionText = customContent?.introduction || drug.mechanism_of_action;
  const usageText = customContent?.usage_info || 
    (drug.approved_indications?.length > 0 
      ? drug.approved_indications.slice(0, maxIndications).map((ind: string) => `• ${ind}`).join('\n')
      : null);
  
  const dosingText = customContent?.dosing_info || null;
  const contraindicationsText = customContent?.contraindications ||
    (drug.contraindications?.length > 0
      ? drug.contraindications.slice(0, maxContraindications).map((c: string) => `• ${c}`).join('\n')
      : null);
  
  const sideEffectsCommonText = customContent?.side_effects_common ||
    (drug.side_effects?.common?.length > 0
      ? drug.side_effects.common.slice(0, maxCommonSideEffects).map((e: string) => `• ${e}`).join('\n')
      : null);
  
  const sideEffectsSeriousText = customContent?.side_effects_serious ||
    (drug.side_effects?.serious?.length > 0
      ? drug.side_effects.serious.slice(0, maxSeriousSideEffects).map((e: string) => `• ${e}`).join('\n')
      : null);
  
  const tipsText = customContent?.tips ||
    (drug.patient_counseling_points?.length > 0
      ? drug.patient_counseling_points.slice(0, maxCounselingPoints).map((p: string) => `• ${p}`).join('\n')
      : null);
  
  const monitoringText = customContent?.monitoring ||
    (drug.monitoring_requirements?.length > 0
      ? drug.monitoring_requirements.slice(0, maxMonitoring).map((r: string) => `• ${r}`).join('\n')
      : null);

  // Helper to format text with line breaks
  const formatText = (text: string | null) => {
    if (!text) return '';
    return text.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('•')) {
        return `<li>${trimmed.substring(1).trim()}</li>`;
      }
      return trimmed ? `<p>${trimmed}</p>` : '';
    }).join('');
  };

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

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patiëntinformatie - ${drug.generic_name}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm;
      background: white;
       overflow: auto;
    }
    .logo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 2px solid #6b2d5b;
    }
    .logo-header img {
      max-height: 50px;
      width: auto;
    }
    .header-title {
      text-align: right;
    }
    .header-title h1 {
      color: #6b2d5b;
      font-size: 22px;
      margin-bottom: 4px;
    }
    .header-title .subtitle {
      color: #666;
      font-size: 13px;
    }
    .drug-class {
      display: inline-block;
      background: #f5e6f0;
      color: #6b2d5b;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 12px;
      margin-top: 4px;
    }
    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 14px;
    }
    .section {
      margin-bottom: 10px;
    }
    .section h2 {
      color: #6b2d5b;
      font-size: 15px;
      margin-bottom: 6px;
      padding-bottom: 2px;
      border-bottom: 1px solid #e0e0e0;
    }
    .section p {
      margin-bottom: 4px;
      color: #333;
      font-size: 13px;
    }
    .section ul {
      margin-left: 14px;
      margin-bottom: 6px;
    }
    .section li {
      margin-bottom: 3px;
      color: #333;
      font-size: 13px;
    }
    .warning-box {
      background: #fff8e6;
      border-left: 3px solid #e87722;
      padding: 8px 10px;
      margin: 6px 0;
      border-radius: 0 3px 3px 0;
    }
    .warning-box h3 {
      color: #cc7a00;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .danger-box {
      background: #ffe6e6;
      border-left: 3px solid #cc0000;
      padding: 8px 10px;
      margin: 6px 0;
      border-radius: 0 3px 3px 0;
    }
    .danger-box h3 {
      color: #cc0000;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .info-box {
      background: #f5e6f0;
      border-left: 3px solid #6b2d5b;
      padding: 8px 10px;
      margin: 6px 0;
      border-radius: 0 3px 3px 0;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .contact-section {
      background: #f5f5f5;
      padding: 10px 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 12px;
    }
    .contact-section h2 {
      font-size: 14px;
      margin-bottom: 8px;
      color: #6b2d5b;
    }
    .contact-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .contact-grid p {
      margin: 0;
      white-space: nowrap;
    }
    .footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e0e0e0;
      font-size: 11px;
      color: #666;
      text-align: center;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="${logoUrl}" alt="RZ Tienen Logo" />
    <div class="header-title">
      <h1>${drug.generic_name}${brandNamesText}</h1>
      <p class="subtitle">Informatie voor patiënten</p>
    </div>
  </div>

  <div class="content">
    ${introductionText ? `
    <div class="section">
      <h2>Wat is ${drug.generic_name}?</h2>
      <p>${introductionText}</p>
    </div>
    ` : ''}

    ${usageText ? `
    <div class="section">
      <h2>Waarvoor wordt het gebruikt?</h2>
      ${customContent?.usage_info ? formatAsList(usageText) : `<ul>${drug.approved_indications.slice(0, maxIndications).map((ind: string) => `<li>${ind}</li>`).join('')}</ul>`}
    </div>
    ` : ''}

    ${includeDosing && (dosingText || drug.dosing_info) ? `
    <div class="section">
      <h2>Hoe wordt het gegeven?</h2>
      ${dosingText ? `<p>${dosingText.replace(/\n/g, '<br>')}</p>` : `
        ${drug.dosing_info.standard_dose ? `<p><strong>Dosering:</strong> ${drug.dosing_info.standard_dose}</p>` : ''}
        ${drug.dosing_info.frequency ? `<p><strong>Frequentie:</strong> ${drug.dosing_info.frequency}</p>` : ''}
        ${drug.dosing_info.duration ? `<p><strong>Duur:</strong> ${drug.dosing_info.duration}</p>` : ''}
        ${drug.cycle_length_days ? `<p><strong>Cyclus:</strong> ${drug.cycle_length_days} dagen</p>` : ''}
      `}
    </div>
    ` : ''}

    ${contraindicationsText ? `
    <div class="section">
      <h2>Wanneer niet gebruiken</h2>
      ${customContent?.contraindications ? formatAsList(contraindicationsText) : `<ul>${drug.contraindications.slice(0, maxContraindications).map((contra: string) => `<li>${contra}</li>`).join('')}</ul>`}
    </div>
    ` : ''}

    ${includeSideEffects && (sideEffectsCommonText || sideEffectsSeriousText) ? `
    <div class="section full-width">
      <h2>Mogelijke bijwerkingen</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${sideEffectsCommonText ? `
        <div class="warning-box">
          <h3>Veel voorkomend</h3>
          ${customContent?.side_effects_common ? formatAsList(sideEffectsCommonText) : `<ul style="margin-left: 14px;">${drug.side_effects.common.slice(0, maxCommonSideEffects).map((effect: string) => `<li>${effect}</li>`).join('')}</ul>`}
        </div>
        ` : ''}
        ${sideEffectsSeriousText ? `
        <div class="danger-box">
          <h3>Ernstig - Neem direct contact op</h3>
          ${customContent?.side_effects_serious ? formatAsList(sideEffectsSeriousText) : `<ul style="margin-left: 14px;">${drug.side_effects.serious.slice(0, maxSeriousSideEffects).map((effect: string) => `<li>${effect}</li>`).join('')}</ul>`}
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${tipsText ? `
    <div class="section">
      <h2>Belangrijke tips</h2>
      <div class="info-box">
        ${customContent?.tips ? formatAsList(tipsText) : `<ul style="margin-left: 14px;">${drug.patient_counseling_points.slice(0, maxCounselingPoints).map((point: string) => `<li>${point}</li>`).join('')}</ul>`}
      </div>
    </div>
    ` : ''}

    ${monitoringText ? `
    <div class="section">
      <h2>Controles</h2>
      ${customContent?.monitoring ? formatAsList(monitoringText) : `<ul>${drug.monitoring_requirements.slice(0, maxMonitoring).map((req: string) => `<li>${req}</li>`).join('')}</ul>`}
    </div>
    ` : ''}
  </div>

  <div class="contact-section full-width">
    <h2>Contact</h2>
    <div class="contact-grid">
      <p><strong>Arts:</strong> ${physicianName || '_________________'}</p>
      <p><strong>Verpleegkundige:</strong> ${nurseName || '_________________'}</p>
      <p><strong>Tel:</strong> 016 80 90 11</p>
    </div>
  </div>

  <div class="footer">
    <p>RZ Tienen - Oncologie | ${new Date().toLocaleDateString('nl-NL')} | Deze informatie is bedoeld als aanvulling op het gesprek met uw arts.</p>
  </div>
</body>
</html>
  `.trim();
}
