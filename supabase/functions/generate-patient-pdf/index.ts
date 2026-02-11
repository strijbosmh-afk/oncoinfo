import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
     // Authenticate user
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
 
     if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
       throw new Error("Supabase configuration is missing");
     }
 
     const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const { data: { user }, error: authError } = await authClient.auth.getUser();
     if (authError || !user) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Service role key not configured");
     if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
 
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

     const { trial_id, drug_name, include_dosing = true, include_side_effects = true } = await req.json();
     
    if (!trial_id) {
      return new Response(
        JSON.stringify({ error: "trial_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's hospital for branding
    const { data: userProfile } = await authClient.from('profiles').select('hospital_id').eq('user_id', user.id).maybeSingle();
    let hospital: any = null;
    let hospitalDoctors: any[] = [];
    if (userProfile?.hospital_id) {
      const { data: h } = await supabase.from('hospitals').select('*').eq('id', userProfile.hospital_id).maybeSingle();
      hospital = h;
      const { data: docs } = await supabase.from('hospital_doctors').select('*').eq('hospital_id', userProfile.hospital_id).eq('is_active', true).order('display_order');
      hospitalDoctors = docs || [];
    }

    // Fetch trial data
    const { data: trial, error: trialError } = await supabase
      .from("trials")
      .select("*")
      .eq("id", trial_id)
      .single();

    if (trialError || !trial) throw new Error("Trial not found");

    const { data: arms } = await supabase.from("arms").select("*").eq("trial_id", trial_id);
    const { data: endpoints } = await supabase.from("endpoints").select("*").eq("trial_id", trial_id);

    const selectedDrug = drug_name || (trial.drugs && trial.drugs[0]) || "het voorgeschreven medicijn";

    const trialContext = `
Trial: ${trial.acronym} - ${trial.title}
Disease: ${trial.disease_area}
Drugs used: ${trial.drugs?.join(", ") || "Not specified"}
Selected drug for patient: ${selectedDrug}

Treatment arms:
${arms?.map(a => `- ${a.name}: ${a.description || a.treatment_details || ""}`).join("\n") || "Not available"}

Results:
${endpoints?.map(e => `- ${e.endpoint_name}: HR=${e.hazard_ratio || "N/A"}, median=${e.median_months || "N/A"} months`).join("\n") || "Not available"}

Results summary: ${JSON.stringify(trial.results_summary) || "Not available"}
Safety highlights: ${trial.safety_highlights || "Not available"}
`;

    const systemPrompt = `Je bent een medisch schrijver die patiëntinformatie schrijft in het Nederlands.
Schrijf een duidelijke, begrijpelijke patiëntinformatiebrief over het voorgeschreven medicijn.

De brief moet bevatten:
1. Titel en introductie
2. Wat is dit medicijn en waarvoor wordt het gebruikt
3. Wat heeft het onderzoek aangetoond (resultaten in eenvoudige taal)
4. ${include_dosing ? "Hoe wordt het medicijn toegediend (dosering/schema)" : ""}
5. ${include_side_effects ? "Mogelijke bijwerkingen en wat te doen" : ""}
6. Belangrijke aandachtspunten
7. Contactinformatie placeholder

Schrijf in eenvoudig Nederlands, vermijd medisch jargon, en wees geruststellend maar eerlijk.
Formatteer als HTML voor PDF generatie.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Genereer een patiëntinformatiebrief voor het medicijn "${selectedDrug}" gebaseerd op deze trial:\n\n${trialContext}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_patient_info",
              description: "Generate patient information document in Dutch",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Document title in Dutch"
                  },
                  drug_name: {
                    type: "string",
                    description: "Name of the drug"
                  },
                  introduction: {
                    type: "string",
                    description: "Introduction paragraph in Dutch"
                  },
                  what_is_it: {
                    type: "string",
                    description: "What is this medication and what is it used for (Dutch)"
                  },
                  study_results: {
                    type: "string",
                    description: "What the study showed in simple terms (Dutch)"
                  },
                  dosing: {
                    type: "string",
                    description: "Dosing and administration information (Dutch)"
                  },
                  side_effects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        effects: { type: "array", items: { type: "string" } },
                        action: { type: "string" }
                      }
                    },
                    description: "Side effects organized by frequency/category"
                  },
                  important_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Important notes and warnings (Dutch)"
                  },
                  when_to_contact_doctor: {
                    type: "array",
                    items: { type: "string" },
                    description: "When to contact the doctor (Dutch)"
                  }
                },
                required: ["title", "drug_name", "introduction", "what_is_it", "study_results"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_patient_info" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) throw new Error("No content generated");
    
    const patientInfo = JSON.parse(toolCall.function.arguments);

    // Generate HTML for PDF with hospital branding
    const html = generatePatientPdfHtml(patientInfo, trial, include_dosing, include_side_effects, hospital, hospitalDoctors);

    return new Response(
      JSON.stringify({ 
        success: true,
        patientInfo,
        html,
        trial_acronym: trial.acronym
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generatePatientPdfHtml(info: any, trial: any, includeDosing: boolean, includeSideEffects: boolean, hospital: any, doctors: any[]): string {
  const primaryColor = hospital?.branding?.primary_color || '#0077b6';
  const hospitalName = hospital?.name || 'OncoInfo';
  const logoUrl = hospital?.logo_url || '';
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${info.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .header img { height: 50px; width: auto; }
    
    .header h1 {
      font-size: 22pt;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      font-size: 14pt;
      color: #444;
    }
    
    .drug-highlight {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    
    .drug-highlight h2 {
      font-size: 16pt;
      margin-bottom: 5px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section h3 {
      font-size: 13pt;
      color: ${primaryColor};
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .section p {
      margin-bottom: 10px;
    }
    
    .side-effects-box {
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 15px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .side-effects-box h4 {
      color: #856404;
      margin-bottom: 8px;
    }
    
    .side-effects-box ul {
      margin-left: 20px;
    }
    
    .warning-box {
      background: #ffebee;
      border-left: 4px solid #d32f2f;
      padding: 15px;
      margin: 15px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .warning-box h4 {
      color: #c62828;
      margin-bottom: 8px;
    }
    
    .info-box {
      background: #e3f2fd;
      border-left: 4px solid #1976d2;
      padding: 15px;
      margin: 15px 0;
      border-radius: 0 8px 8px 0;
    }
    
    ul {
      margin-left: 20px;
      margin-bottom: 10px;
    }
    
    li {
      margin-bottom: 5px;
    }
    
    .contact-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    
    .contact-section h3 {
      border: none;
      margin-bottom: 15px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 9pt;
      color: #666;
    }
    
    .study-reference {
      font-style: italic;
      color: #666;
      font-size: 10pt;
    }
    
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${hospitalName}" />` : ''}
    <div>
      <h1>Patiëntinformatie – ${hospitalName}</h1>
      <p class="subtitle">${info.title}</p>
    </div>
  </div>

  <div class="drug-highlight">
    <h2>${info.drug_name}</h2>
    <p>${info.introduction}</p>
  </div>

  <div class="section">
    <h3>Wat is dit medicijn?</h3>
    <p>${info.what_is_it}</p>
  </div>

  <div class="section">
    <h3>Wat heeft het onderzoek aangetoond?</h3>
    <p>${info.study_results}</p>
    <p class="study-reference">Gebaseerd op: ${trial.acronym} studie (${trial.publication_year || 'datum onbekend'})</p>
  </div>

  ${includeDosing && info.dosing ? `
  <div class="section">
    <h3>Dosering en toediening</h3>
    <div class="info-box">
      <p>${info.dosing}</p>
    </div>
  </div>
  ` : ''}

  ${includeSideEffects && info.side_effects ? `
  <div class="section">
    <h3>Mogelijke bijwerkingen</h3>
    ${info.side_effects.map((cat: any) => `
      <div class="side-effects-box">
        <h4>${cat.category}</h4>
        <ul>
          ${cat.effects.map((e: string) => `<li>${e}</li>`).join('')}
        </ul>
        ${cat.action ? `<p><strong>Wat te doen:</strong> ${cat.action}</p>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${info.when_to_contact_doctor ? `
  <div class="section">
    <h3>Neem contact op met uw arts als:</h3>
    <div class="warning-box">
      <ul>
        ${info.when_to_contact_doctor.map((item: string) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}

  ${info.important_notes ? `
  <div class="section">
    <h3>Belangrijke aandachtspunten</h3>
    <ul>
      ${info.important_notes.map((note: string) => `<li>${note}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="contact-section">
    <h3>Heeft u vragen?</h3>
    <p>Neem dan contact op met uw behandelend arts of verpleegkundige:</p>
    ${doctors.length > 0 ? `
      <p><strong>Uw artsen:</strong></p>
      <ul>
        ${doctors.map((d: any) => `<li>${d.name}${d.specialization ? ` – ${d.specialization}` : ''}</li>`).join('')}
      </ul>
    ` : `
      <p><strong>Afdeling:</strong> [Afdeling invullen]</p>
    `}
  </div>

  <div class="footer">
    <p>Dit document is gegenereerd ter ondersteuning van uw behandeling. Het vervangt niet het gesprek met uw arts.</p>
    <p>Gegenereerd op: ${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
</body>
</html>
`;
}
