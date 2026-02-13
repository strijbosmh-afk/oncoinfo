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

     const { trial_id, drug_name, include_dosing = true, include_side_effects = true, language = 'nl' } = await req.json();
     
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

    const langConfig: Record<string, { name: string; locale: string; prompt: string; userMsg: string }> = {
      nl: {
        name: 'Nederlands', locale: 'nl-NL',
        prompt: `Je bent een medisch schrijver die patiëntinformatie schrijft in het Nederlands.
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
Formatteer als HTML voor PDF generatie.`,
        userMsg: `Genereer een patiëntinformatiebrief voor het medicijn "${selectedDrug}" gebaseerd op deze trial:\n\n${trialContext}`,
      },
      fr: {
        name: 'Français', locale: 'fr-BE',
        prompt: `Vous êtes un rédacteur médical qui écrit des informations pour les patients en français.
Rédigez une lettre d'information patient claire et compréhensible sur le médicament prescrit.

La lettre doit contenir :
1. Titre et introduction
2. Qu'est-ce que ce médicament et à quoi sert-il
3. Ce que l'étude a montré (résultats en termes simples)
4. ${include_dosing ? "Comment le médicament est administré (posologie/schéma)" : ""}
5. ${include_side_effects ? "Effets secondaires possibles et que faire" : ""}
6. Points d'attention importants
7. Placeholder pour les coordonnées

Écrivez en français simple, évitez le jargon médical, soyez rassurant mais honnête.
Formatez en HTML pour la génération PDF.`,
        userMsg: `Générez une lettre d'information patient pour le médicament "${selectedDrug}" basée sur cet essai clinique :\n\n${trialContext}`,
      },
      de: {
        name: 'Deutsch', locale: 'de-DE',
        prompt: `Sie sind ein medizinischer Autor, der Patienteninformationen auf Deutsch verfasst.
Schreiben Sie einen klaren, verständlichen Patienteninformationsbrief über das verschriebene Medikament.

Der Brief soll enthalten:
1. Titel und Einleitung
2. Was ist dieses Medikament und wofür wird es verwendet
3. Was die Studie gezeigt hat (Ergebnisse in einfacher Sprache)
4. ${include_dosing ? "Wie wird das Medikament verabreicht (Dosierung/Schema)" : ""}
5. ${include_side_effects ? "Mögliche Nebenwirkungen und was zu tun ist" : ""}
6. Wichtige Hinweise
7. Platzhalter für Kontaktinformationen

Schreiben Sie in einfachem Deutsch, vermeiden Sie medizinischen Fachjargon, seien Sie beruhigend aber ehrlich.
Formatieren Sie als HTML für die PDF-Generierung.`,
        userMsg: `Erstellen Sie einen Patienteninformationsbrief für das Medikament "${selectedDrug}" basierend auf dieser Studie:\n\n${trialContext}`,
      },
      en: {
        name: 'English', locale: 'en-GB',
        prompt: `You are a medical writer who writes patient information in English.
Write a clear, understandable patient information letter about the prescribed medication.

The letter should contain:
1. Title and introduction
2. What is this medication and what is it used for
3. What the study showed (results in simple language)
4. ${include_dosing ? "How the medication is given (dosing/schedule)" : ""}
5. ${include_side_effects ? "Possible side effects and what to do" : ""}
6. Important points to note
7. Contact information placeholder

Write in simple English, avoid medical jargon, be reassuring but honest.
Format as HTML for PDF generation.`,
        userMsg: `Generate a patient information letter for the medication "${selectedDrug}" based on this trial:\n\n${trialContext}`,
      },
    };

    const lc = langConfig[language] || langConfig.nl;

    const systemPrompt = lc.prompt;

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
          { role: "user", content: lc.userMsg }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_patient_info",
              description: `Generate patient information document in ${lc.name}`,
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: `Document title in ${lc.name}`
                  },
                  drug_name: {
                    type: "string",
                    description: "Name of the drug"
                  },
                  introduction: {
                    type: "string",
                    description: `Introduction paragraph in ${lc.name}`
                  },
                  what_is_it: {
                    type: "string",
                    description: `What is this medication and what is it used for (${lc.name})`
                  },
                  study_results: {
                    type: "string",
                    description: `What the study showed in simple terms (${lc.name})`
                  },
                  study_results: {
                    type: "string",
                    description: `What the study showed in simple terms (${lc.name})`
                  },
                  dosing: {
                    type: "string",
                    description: `Dosing and administration information (${lc.name})`
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
                    description: `Important notes and warnings (${lc.name})`
                  },
                  when_to_contact_doctor: {
                    type: "array",
                    items: { type: "string" },
                    description: `When to contact the doctor (${lc.name})`
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
    const html = generatePatientPdfHtml(patientInfo, trial, include_dosing, include_side_effects, hospital, hospitalDoctors, language);

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

function generatePatientPdfHtml(info: any, trial: any, includeDosing: boolean, includeSideEffects: boolean, hospital: any, doctors: any[], language: string = 'nl'): string {
  const primaryColor = hospital?.branding?.primary_color || '#0077b6';
  const hospitalName = hospital?.name || 'OncoInfo';
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || '';
  const APP_URL = 'https://oncoinfo.lovable.app';
  const rawLogoUrl = hospital?.branding?.patient_folder_logo_url || hospital?.logo_url || '';
  const logoUrl = rawLogoUrl
    ? (rawLogoUrl.startsWith('http') ? rawLogoUrl
      : rawLogoUrl.startsWith('/') ? `${APP_URL}${rawLogoUrl}`
      : `${SUPABASE_URL}/storage/v1/object/public/public-assets/${rawLogoUrl}`)
    : '';

  const localeMap: Record<string, string> = { nl: 'nl-NL', fr: 'fr-BE', de: 'de-DE', en: 'en-GB' };
  const locale = localeMap[language] || 'nl-NL';

  const pdfLabels: Record<string, any> = {
    nl: {
      headerTitle: `Patiëntinformatie – ${hospitalName}`,
      whatIs: 'Wat is dit medicijn?',
      studyResults: 'Wat heeft het onderzoek aangetoond?',
      basedOn: 'Gebaseerd op',
      study: 'studie',
      dateUnknown: 'datum onbekend',
      dosing: 'Dosering en toediening',
      sideEffects: 'Mogelijke bijwerkingen',
      whatToDo: 'Wat te doen:',
      contactDoctor: 'Neem contact op met uw arts als:',
      importantNotes: 'Belangrijke aandachtspunten',
      questions: 'Heeft u vragen?',
      questionsDesc: 'Neem dan contact op met uw behandelend arts of verpleegkundige:',
      yourDoctors: 'Uw artsen:',
      department: 'Afdeling:',
      departmentPlaceholder: '[Afdeling invullen]',
      footer: 'Dit document is gegenereerd ter ondersteuning van uw behandeling. Het vervangt niet het gesprek met uw arts.',
      generatedOn: 'Gegenereerd op:',
      disclaimerTitle: 'Belangrijke mededeling',
      disclaimerText: 'Dit document is uitsluitend bedoeld als informatief hulpmiddel en is geen medisch hulpmiddel in de zin van de Europese Verordening Medische Hulpmiddelen (MDR 2017/745). De inhoud kan fouten of onvolledigheden bevatten en mag niet worden gebruikt als enige basis voor klinische beslissingen. Raadpleeg altijd uw behandelend arts of apotheker.',
    },
    fr: {
      headerTitle: `Information patient – ${hospitalName}`,
      whatIs: 'Qu\'est-ce que ce médicament ?',
      studyResults: 'Qu\'a montré l\'étude ?',
      basedOn: 'Basé sur',
      study: 'étude',
      dateUnknown: 'date inconnue',
      dosing: 'Posologie et administration',
      sideEffects: 'Effets secondaires possibles',
      whatToDo: 'Que faire :',
      contactDoctor: 'Contactez votre médecin si :',
      importantNotes: 'Points d\'attention importants',
      questions: 'Vous avez des questions ?',
      questionsDesc: 'Contactez votre médecin traitant ou infirmier(ère) :',
      yourDoctors: 'Vos médecins :',
      department: 'Service :',
      departmentPlaceholder: '[À compléter]',
      footer: 'Ce document a été généré pour accompagner votre traitement. Il ne remplace pas l\'entretien avec votre médecin.',
      generatedOn: 'Généré le :',
      disclaimerTitle: 'Avis important',
      disclaimerText: 'Ce document est uniquement destiné à des fins informatives et ne constitue pas un dispositif médical au sens du Règlement européen relatif aux dispositifs médicaux (MDR 2017/745). Son contenu peut contenir des erreurs ou des inexactitudes et ne doit pas servir de base unique pour des décisions cliniques. Consultez toujours votre médecin traitant ou pharmacien.',
    },
    de: {
      headerTitle: `Patienteninformation – ${hospitalName}`,
      whatIs: 'Was ist dieses Medikament?',
      studyResults: 'Was hat die Studie gezeigt?',
      basedOn: 'Basierend auf',
      study: 'Studie',
      dateUnknown: 'Datum unbekannt',
      dosing: 'Dosierung und Verabreichung',
      sideEffects: 'Mögliche Nebenwirkungen',
      whatToDo: 'Was tun:',
      contactDoctor: 'Kontaktieren Sie Ihren Arzt, wenn:',
      importantNotes: 'Wichtige Hinweise',
      questions: 'Haben Sie Fragen?',
      questionsDesc: 'Kontaktieren Sie Ihren behandelnden Arzt oder Ihre Pflegekraft:',
      yourDoctors: 'Ihre Ärzte:',
      department: 'Abteilung:',
      departmentPlaceholder: '[Abteilung eintragen]',
      footer: 'Dieses Dokument wurde zur Unterstützung Ihrer Behandlung erstellt. Es ersetzt nicht das Gespräch mit Ihrem Arzt.',
      generatedOn: 'Erstellt am:',
      disclaimerTitle: 'Wichtiger Hinweis',
      disclaimerText: 'Dieses Dokument dient ausschließlich zu Informationszwecken und ist kein Medizinprodukt im Sinne der Europäischen Medizinprodukteverordnung (MDR 2017/745). Der Inhalt kann Fehler oder Ungenauigkeiten enthalten und darf nicht als alleinige Grundlage für klinische Entscheidungen verwendet werden. Konsultieren Sie immer Ihren behandelnden Arzt oder Apotheker.',
    },
    en: {
      headerTitle: `Patient Information – ${hospitalName}`,
      whatIs: 'What is this medication?',
      studyResults: 'What did the study show?',
      basedOn: 'Based on',
      study: 'study',
      dateUnknown: 'date unknown',
      dosing: 'Dosing and administration',
      sideEffects: 'Possible side effects',
      whatToDo: 'What to do:',
      contactDoctor: 'Contact your doctor if:',
      importantNotes: 'Important points',
      questions: 'Do you have questions?',
      questionsDesc: 'Contact your treating physician or nurse:',
      yourDoctors: 'Your physicians:',
      department: 'Department:',
      departmentPlaceholder: '[Fill in department]',
      footer: 'This document was generated to support your treatment. It does not replace the conversation with your doctor.',
      generatedOn: 'Generated on:',
      disclaimerTitle: 'Important notice',
      disclaimerText: 'This document is intended for informational purposes only and is not a medical device within the meaning of the European Medical Devices Regulation (MDR 2017/745). Its content may contain errors or inaccuracies and should not be used as the sole basis for clinical decisions. Always consult your treating physician or pharmacist.',
    },
  };

  const l = pdfLabels[language] || pdfLabels.nl;

  return `
<!DOCTYPE html>
<html lang="${language}">
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
      <h1>${l.headerTitle}</h1>
      <p class="subtitle">${info.title}</p>
    </div>
  </div>

  <div class="drug-highlight">
    <h2>${info.drug_name}</h2>
    <p>${info.introduction}</p>
  </div>

  <div class="section">
    <h3>${l.whatIs}</h3>
    <p>${info.what_is_it}</p>
  </div>

  <div class="section">
    <h3>${l.studyResults}</h3>
    <p>${info.study_results}</p>
    <p class="study-reference">${l.basedOn}: ${trial.acronym} ${l.study} (${trial.publication_year || l.dateUnknown})</p>
  </div>

  ${includeDosing && info.dosing ? `
  <div class="section">
    <h3>${l.dosing}</h3>
    <div class="info-box">
      <p>${info.dosing}</p>
    </div>
  </div>
  ` : ''}

  ${includeSideEffects && info.side_effects ? `
  <div class="section">
    <h3>${l.sideEffects}</h3>
    ${info.side_effects.map((cat: any) => `
      <div class="side-effects-box">
        <h4>${cat.category}</h4>
        <ul>
          ${cat.effects.map((e: string) => `<li>${e}</li>`).join('')}
        </ul>
        ${cat.action ? `<p><strong>${l.whatToDo}</strong> ${cat.action}</p>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${info.when_to_contact_doctor ? `
  <div class="section">
    <h3>${l.contactDoctor}</h3>
    <div class="warning-box">
      <ul>
        ${info.when_to_contact_doctor.map((item: string) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}

  ${info.important_notes ? `
  <div class="section">
    <h3>${l.importantNotes}</h3>
    <ul>
      ${info.important_notes.map((note: string) => `<li>${note}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="contact-section">
    <h3>${l.questions}</h3>
    <p>${l.questionsDesc}</p>
    ${doctors.length > 0 ? `
      <p><strong>${l.yourDoctors}</strong></p>
      <ul>
        ${doctors.map((d: any) => `<li>${d.name}${d.specialization ? ` – ${d.specialization}` : ''}</li>`).join('')}
      </ul>
    ` : `
      <p><strong>${l.department}</strong> ${l.departmentPlaceholder}</p>
    `}
  </div>

  <div style="margin-top: 25px; padding: 15px; border: 2px solid #cc0000; border-radius: 8px; background: #fff5f5;">
    <p style="font-weight: 700; color: #cc0000; margin-bottom: 6px; font-size: 10pt;">⚠ ${l.disclaimerTitle}</p>
    <p style="font-size: 8.5pt; color: #444; line-height: 1.5;">${l.disclaimerText}</p>
  </div>

  <div class="footer">
    <p>${l.footer}</p>
    <p>${l.generatedOn} ${new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
</body>
</html>
`;
}
