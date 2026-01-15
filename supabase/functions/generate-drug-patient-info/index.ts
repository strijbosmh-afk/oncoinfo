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
    const { drug_id, include_dosing = true, include_side_effects = true } = await req.json();

    if (!drug_id) {
      return new Response(
        JSON.stringify({ error: 'drug_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Logo URL from the published site
    const logoUrl = 'https://uroinfo.lovable.app/images/logo-rzt.png';
    
    // Generate patient-friendly HTML
    const html = generatePatientInfoHtml(drug, include_dosing, include_side_effects, logoUrl);

    return new Response(
      JSON.stringify({ 
        html,
        drug_name: drug.generic_name,
        brand_names: drug.brand_names
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

function generatePatientInfoHtml(drug: any, includeDosing: boolean, includeSideEffects: boolean, logoUrl: string): string {
  const brandNamesText = drug.brand_names?.length > 0 
    ? ` (${drug.brand_names.join(', ')})` 
    : '';

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patiëntinformatie - ${drug.generic_name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    .logo-header {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .logo-header img {
      max-height: 60px;
      width: auto;
    }
    .header {
      border-bottom: 3px solid #6b2d5b;
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      color: #6b2d5b;
      font-size: 28px;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #666;
      font-size: 16px;
    }
    .drug-class {
      display: inline-block;
      background: #f5e6f0;
      color: #6b2d5b;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 28px;
    }
    .section h2 {
      color: #6b2d5b;
      font-size: 20px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e0e0e0;
    }
    .section p {
      margin-bottom: 10px;
      color: #333;
    }
    .section ul {
      margin-left: 20px;
      margin-bottom: 10px;
    }
    .section li {
      margin-bottom: 6px;
      color: #333;
    }
    .warning-box {
      background: #fff3e6;
      border-left: 4px solid #e87722;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .warning-box h3 {
      color: #cc7a00;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .danger-box {
      background: #ffe6e6;
      border-left: 4px solid #cc0000;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .danger-box h3 {
      color: #cc0000;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .info-box {
      background: #f5e6f0;
      border-left: 4px solid #6b2d5b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .info-box h3 {
      color: #6b2d5b;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .contact-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .contact-section h2 {
      border-bottom: none;
      margin-bottom: 15px;
      color: #6b2d5b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="${logoUrl}" alt="RZ Tienen Logo" />
  </div>
  
  <div class="header">
    <h1>${drug.generic_name}${brandNamesText}</h1>
    <p class="subtitle">Informatie voor patiënten</p>
    <span class="drug-class">${drug.drug_class}</span>
  </div>

  ${drug.mechanism_of_action ? `
  <div class="section">
    <h2>Wat is ${drug.generic_name}?</h2>
    <p>${drug.mechanism_of_action}</p>
    ${drug.administration_route ? `<p><strong>Toediening:</strong> ${drug.administration_route}</p>` : ''}
  </div>
  ` : ''}

  ${drug.approved_indications?.length > 0 ? `
  <div class="section">
    <h2>Waarvoor wordt het gebruikt?</h2>
    <ul>
      ${drug.approved_indications.map((ind: string) => `<li>${ind}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${includeDosing && drug.dosing_info ? `
  <div class="section">
    <h2>Hoe wordt het gegeven?</h2>
    ${drug.dosing_info.standard_dose ? `<p><strong>Standaard dosering:</strong> ${drug.dosing_info.standard_dose}</p>` : ''}
    ${drug.dosing_info.frequency ? `<p><strong>Hoe vaak:</strong> ${drug.dosing_info.frequency}</p>` : ''}
    ${drug.dosing_info.duration ? `<p><strong>Behandelduur:</strong> ${drug.dosing_info.duration}</p>` : ''}
    ${drug.cycle_length_days ? `<p><strong>Cyclusduur:</strong> ${drug.cycle_length_days} dagen</p>` : ''}
  </div>
  ` : ''}

  ${includeSideEffects && drug.side_effects?.common?.length > 0 ? `
  <div class="section">
    <h2>Mogelijke bijwerkingen</h2>
    <div class="warning-box">
      <h3>Veel voorkomende bijwerkingen</h3>
      <ul>
        ${drug.side_effects.common.map((effect: string) => `<li>${effect}</li>`).join('')}
      </ul>
    </div>
    ${drug.side_effects.serious?.length > 0 ? `
    <div class="danger-box">
      <h3>Ernstige bijwerkingen - Neem direct contact op met uw arts</h3>
      <ul>
        ${drug.side_effects.serious.map((effect: string) => `<li>${effect}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${drug.patient_counseling_points?.length > 0 ? `
  <div class="section">
    <h2>Belangrijke tips</h2>
    <div class="info-box">
      <ul>
        ${drug.patient_counseling_points.map((point: string) => `<li>${point}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}

  ${drug.contraindications?.length > 0 ? `
  <div class="section">
    <h2>Wanneer niet gebruiken</h2>
    <ul>
      ${drug.contraindications.map((contra: string) => `<li>${contra}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${drug.monitoring_requirements?.length > 0 ? `
  <div class="section">
    <h2>Controles tijdens behandeling</h2>
    <ul>
      ${drug.monitoring_requirements.map((req: string) => `<li>${req}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="contact-section">
    <h2>Contact</h2>
    <p>Heeft u vragen over dit medicijn? Neem contact op met:</p>
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
