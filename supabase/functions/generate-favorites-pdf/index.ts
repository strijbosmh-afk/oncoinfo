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
     // Authenticate user
     const authHeader = req.headers.get('Authorization');
     if (!authHeader?.startsWith('Bearer ')) {
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }

     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 
     const authClient = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const { data: { user }, error: authError } = await authClient.auth.getUser();
     if (authError || !user) {
      return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

     const supabase = createClient(supabaseUrl, supabaseServiceKey);

     // Fetch user's hospital for branding
     const { data: userProfile } = await supabase
       .from('profiles')
       .select('hospital_id')
       .eq('user_id', user.id)
       .maybeSingle();

     let hospitalName = 'OncoInfo';
     let hospitalColor = '#6b2d5b';
     const appUrl = Deno.env.get('APP_URL') || 'https://www.oncoinfo.be';
     let hospitalLogoUrl = `${appUrl}/images/logo-rzt.png`;

     if (userProfile?.hospital_id) {
       const { data: hospital } = await supabase
         .from('hospitals')
         .select('name, logo_url, branding')
         .eq('id', userProfile.hospital_id)
         .maybeSingle();
       if (hospital) {
         hospitalName = hospital.name;
         hospitalColor = (hospital.branding as any)?.primary_color || '#6b2d5b';
          if (hospital.logo_url) {
            hospitalLogoUrl = hospital.logo_url.startsWith('http')
              ? hospital.logo_url
              : hospital.logo_url.startsWith('/')
                ? `${appUrl}${hospital.logo_url}`
                : `${supabaseUrl}/storage/v1/object/public/public-assets/${hospital.logo_url}`;
          }
       }
     }
 
     const { drug_ids, include_dosing = true, include_side_effects = true } = await req.json();
 
     if (!drug_ids || !Array.isArray(drug_ids) || drug_ids.length === 0) {
       return new Response(
         JSON.stringify({ error: 'drug_ids array is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }

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

    // Generate combined HTML for all drugs with hospital branding
    const html = generateCombinedHtml(drugs, include_dosing, include_side_effects, hospitalLogoUrl, hospitalName, hospitalColor);

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

function generateDrugSection(drug: any, includeDosing: boolean, includeSideEffects: boolean, _hospitalColor?: string): string {
  const brandNamesText = drug.brand_names?.length > 0 
    ? ` (${drug.brand_names.slice(0, 2).join(', ')})` 
    : '';

  return `
  <div class="drug-section">
    <div class="drug-header">
      <h2>${drug.generic_name}${brandNamesText}</h2>
      <span class="drug-class">${drug.drug_class}</span>
    </div>
    <div class="drug-content">
      ${drug.mechanism_of_action ? `<p class="moa">${drug.mechanism_of_action.substring(0, 150)}${drug.mechanism_of_action.length > 150 ? '...' : ''}</p>` : ''}
      
      ${drug.approved_indications?.length > 0 ? `
      <div class="inline-list"><strong>Indicaties:</strong> ${drug.approved_indications.slice(0, 2).join('; ')}</div>
      ` : ''}

      ${includeDosing && drug.dosing_info?.standard_dose ? `
      <div class="inline-list"><strong>Dosering:</strong> ${drug.dosing_info.standard_dose}</div>
      ` : ''}

      ${includeSideEffects && drug.side_effects?.common?.length > 0 ? `
      <div class="side-effects">
        <span class="warning-label">Bijwerkingen:</span> ${drug.side_effects.common.slice(0, 4).join(', ')}
        ${drug.side_effects.serious?.length > 0 ? `<span class="danger-label">Ernstig:</span> ${drug.side_effects.serious.slice(0, 2).join(', ')}` : ''}
      </div>
      ` : ''}

      ${drug.patient_counseling_points?.length > 0 ? `
      <div class="tips"><strong>Tips:</strong> ${drug.patient_counseling_points.slice(0, 2).join('; ')}</div>
      ` : ''}
    </div>
  </div>
  `;
}

function generateCombinedHtml(drugs: any[], includeDosing: boolean, includeSideEffects: boolean, logoUrl: string, hospitalName: string = 'OncoInfo', hospitalColor: string = '#6b2d5b'): string {
  const drugSections = drugs.map(drug => generateDrugSection(drug, includeDosing, includeSideEffects, hospitalColor)).join('');

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Favoriete Medicijnen - Patiëntinformatie</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 9px; line-height: 1.3; color: #1a1a1a;
      width: 210mm; min-height: 297mm; max-height: 297mm;
      margin: 0 auto; padding: 10mm; background: white; overflow: hidden;
    }
    .logo-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 6px; padding-bottom: 6px; border-bottom: 2px solid ${hospitalColor};
    }
    .logo-header img { max-height: 32px; width: auto; }
    .header-title h1 { color: ${hospitalColor}; font-size: 14px; }
    .header-title .subtitle { color: #666; font-size: 9px; }
    .drugs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .drug-section { border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px 8px; background: #fafafa; }
    .drug-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0;
    }
    .drug-header h2 { color: ${hospitalColor}; font-size: 11px; margin: 0; }
    .drug-class { background: #f5e6f0; color: ${hospitalColor}; padding: 1px 6px; border-radius: 3px; font-size: 8px; }
    .drug-content { font-size: 8px; }
    .drug-content p, .drug-content div { margin-bottom: 2px; }
    .moa { color: #555; font-style: italic; }
    .inline-list { color: #333; }
    .side-effects { color: #333; }
    .warning-label { color: #cc7a00; font-weight: 600; }
    .danger-label { color: #cc0000; font-weight: 600; margin-left: 6px; }
    .tips { color: ${hospitalColor}; }
    .contact-section {
      background: #f5f5f5; padding: 6px 10px; border-radius: 4px; margin-top: 8px;
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 8px;
    }
    .contact-section h2 { grid-column: 1 / -1; font-size: 10px; color: ${hospitalColor}; margin-bottom: 2px; }
    .footer {
      margin-top: 6px; padding-top: 4px; border-top: 1px solid #e0e0e0;
      font-size: 7px; color: #666; text-align: center;
    }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="${logoUrl}" alt="${hospitalName} Logo" />
    <div class="header-title">
      <h1>Mijn Medicijnen</h1>
      <p class="subtitle">${drugs.length} medicijn${drugs.length !== 1 ? 'en' : ''} - Patiëntinformatie</p>
    </div>
  </div>

  <div class="drugs-grid">
    ${drugSections}
  </div>

  <div class="contact-section">
    <h2>Contact</h2>
    <p><strong>Arts:</strong> _____________</p>
    <p><strong>Verpleegkundige:</strong> _____________</p>
    <p><strong>Apotheek:</strong> _____________</p>
    <p><strong>Tel:</strong> _____________</p>
  </div>

  <div style="margin-top: 6px; padding: 5px 8px; border: 1.5px solid #cc0000; border-radius: 4px; background: #fff5f5;">
    <p style="font-weight: 700; color: #cc0000; font-size: 7px; margin-bottom: 2px;">⚠ Belangrijke mededeling</p>
    <p style="font-size: 6.5px; color: #444; line-height: 1.4;">Dit document is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel (MDR 2017/745). De inhoud kan fouten bevatten en mag niet als enige basis voor klinische beslissingen dienen. Raadpleeg altijd uw behandelend arts of apotheker.</p>
  </div>

  <div class="footer">
    <p>${hospitalName} - Oncologie | ${new Date().toLocaleDateString('nl-NL')} | Deze informatie is bedoeld als aanvulling op het gesprek met uw arts.</p>
  </div>
</body>
</html>
  `.trim();
}
