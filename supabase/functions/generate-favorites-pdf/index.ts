import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drug_ids, include_dosing = true, include_side_effects = true } = await req.json();

    if (!drug_ids || !Array.isArray(drug_ids) || drug_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'drug_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all drugs
    const { data: drugs, error: drugsError } = await supabase
      .from('drugs')
      .select('*')
      .in('id', drug_ids);

    if (drugsError || !drugs || drugs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No drugs found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Logo URL from the published site
    const logoUrl = 'https://uroinfo.lovable.app/images/logo-rzt.png';
    
    // Generate combined HTML for all drugs
    const html = generateCombinedHtml(drugs, include_dosing, include_side_effects, logoUrl);

    return new Response(
      JSON.stringify({ 
        html,
        drug_count: drugs.length,
        drug_names: drugs.map(d => d.generic_name)
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

function generateDrugSection(drug: any, includeDosing: boolean, includeSideEffects: boolean): string {
  const brandNamesText = drug.brand_names?.length > 0 
    ? ` (${drug.brand_names.join(', ')})` 
    : '';

  return `
  <div class="drug-section">
    <div class="drug-header">
      <h2>${drug.generic_name}${brandNamesText}</h2>
      <span class="drug-class">${drug.drug_class}</span>
    </div>

    ${drug.mechanism_of_action ? `
    <div class="subsection">
      <h3>Wat is ${drug.generic_name}?</h3>
      <p>${drug.mechanism_of_action}</p>
      ${drug.administration_route ? `<p><strong>Toediening:</strong> ${drug.administration_route}</p>` : ''}
    </div>
    ` : ''}

    ${drug.approved_indications?.length > 0 ? `
    <div class="subsection">
      <h3>Waarvoor wordt het gebruikt?</h3>
      <ul>
        ${drug.approved_indications.map((ind: string) => `<li>${ind}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${includeDosing && drug.dosing_info ? `
    <div class="subsection">
      <h3>Hoe wordt het gegeven?</h3>
      ${drug.dosing_info.standard_dose ? `<p><strong>Standaard dosering:</strong> ${drug.dosing_info.standard_dose}</p>` : ''}
      ${drug.dosing_info.frequency ? `<p><strong>Hoe vaak:</strong> ${drug.dosing_info.frequency}</p>` : ''}
      ${drug.dosing_info.duration ? `<p><strong>Behandelduur:</strong> ${drug.dosing_info.duration}</p>` : ''}
      ${drug.cycle_length_days ? `<p><strong>Cyclusduur:</strong> ${drug.cycle_length_days} dagen</p>` : ''}
    </div>
    ` : ''}

    ${includeSideEffects && drug.side_effects?.common?.length > 0 ? `
    <div class="subsection">
      <h3>Mogelijke bijwerkingen</h3>
      <div class="warning-box">
        <strong>Veel voorkomend:</strong>
        <ul>
          ${drug.side_effects.common.slice(0, 5).map((effect: string) => `<li>${effect}</li>`).join('')}
        </ul>
      </div>
      ${drug.side_effects.serious?.length > 0 ? `
      <div class="danger-box">
        <strong>Ernstig - Neem direct contact op:</strong>
        <ul>
          ${drug.side_effects.serious.slice(0, 3).map((effect: string) => `<li>${effect}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${drug.patient_counseling_points?.length > 0 ? `
    <div class="subsection">
      <h3>Belangrijke tips</h3>
      <ul>
        ${drug.patient_counseling_points.slice(0, 4).map((point: string) => `<li>${point}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${drug.monitoring_requirements?.length > 0 ? `
    <div class="subsection">
      <h3>Controles tijdens behandeling</h3>
      <ul>
        ${drug.monitoring_requirements.slice(0, 4).map((req: string) => `<li>${req}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
  `;
}

function generateCombinedHtml(drugs: any[], includeDosing: boolean, includeSideEffects: boolean, logoUrl: string): string {
  const drugSections = drugs.map(drug => generateDrugSection(drug, includeDosing, includeSideEffects)).join('');

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Favoriete Medicijnen - Patiëntinformatie</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 30px 20px;
      background: white;
    }
    .logo-header {
      display: flex;
      justify-content: center;
      margin-bottom: 15px;
    }
    .logo-header img {
      max-height: 50px;
      width: auto;
    }
    .main-header {
      border-bottom: 3px solid #6b2d5b;
      padding-bottom: 15px;
      margin-bottom: 20px;
      text-align: center;
    }
    .main-header h1 {
      color: #6b2d5b;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .main-header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .toc {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .toc h2 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #6b2d5b;
    }
    .toc ul {
      list-style: none;
      columns: 2;
      column-gap: 20px;
    }
    .toc li {
      font-size: 13px;
      padding: 3px 0;
    }
    .drug-section {
      margin-bottom: 30px;
      padding-bottom: 25px;
      border-bottom: 2px solid #e0e0e0;
      page-break-inside: avoid;
    }
    .drug-section:last-child {
      border-bottom: none;
    }
    .drug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .drug-header h2 {
      color: #6b2d5b;
      font-size: 20px;
    }
    .drug-class {
      display: inline-block;
      background: #f5e6f0;
      color: #6b2d5b;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .subsection {
      margin-bottom: 12px;
    }
    .subsection h3 {
      color: #333;
      font-size: 14px;
      margin-bottom: 6px;
    }
    .subsection p {
      font-size: 13px;
      color: #444;
      margin-bottom: 4px;
    }
    .subsection ul {
      margin-left: 18px;
      font-size: 13px;
    }
    .subsection li {
      margin-bottom: 3px;
      color: #444;
    }
    .warning-box {
      background: #fff8e6;
      border-left: 3px solid #e87722;
      padding: 10px;
      margin: 8px 0;
      border-radius: 0 4px 4px 0;
      font-size: 13px;
    }
    .danger-box {
      background: #ffe6e6;
      border-left: 3px solid #cc0000;
      padding: 10px;
      margin: 8px 0;
      border-radius: 0 4px 4px 0;
      font-size: 13px;
    }
    .warning-box ul, .danger-box ul {
      margin-left: 18px;
      margin-top: 5px;
    }
    .contact-section {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-top: 25px;
    }
    .contact-section h2 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #6b2d5b;
    }
    .contact-section p {
      font-size: 13px;
      margin-bottom: 5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      font-size: 11px;
      color: #666;
      text-align: center;
    }
    @media print {
      body {
        padding: 15px;
      }
      .drug-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="${logoUrl}" alt="RZ Tienen Logo" />
  </div>
  
  <div class="main-header">
    <h1>Mijn Medicijnen</h1>
    <p class="subtitle">Informatie voor patiënten - ${drugs.length} medicijn${drugs.length !== 1 ? 'en' : ''}</p>
  </div>

  <div class="toc">
    <h2>Inhoud</h2>
    <ul>
      ${drugs.map(drug => `<li>• ${drug.generic_name}</li>`).join('')}
    </ul>
  </div>

  ${drugSections}

  <div class="contact-section">
    <h2>Contact</h2>
    <p>Heeft u vragen over deze medicijnen? Neem contact op met:</p>
    <p><strong>Uw behandelend arts:</strong> _______________________</p>
    <p><strong>Verpleegkundige:</strong> _______________________</p>
    <p><strong>Apotheek:</strong> _______________________</p>
    <p><strong>Telefoonnummer:</strong> 016 80 90 11</p>
  </div>

  <div class="footer">
    <p>Dit document is gegenereerd door RZ Tienen - Oncologie | ${new Date().toLocaleDateString('nl-NL')}</p>
    <p>Deze informatie is bedoeld als aanvulling op het gesprek met uw arts en vervangt dit niet.</p>
  </div>
</body>
</html>
  `.trim();
}
