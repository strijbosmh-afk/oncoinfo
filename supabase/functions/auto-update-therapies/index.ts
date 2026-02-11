import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin or apotheker role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("apotheker")) {
      return new Response(JSON.stringify({ error: "Admin of apotheker toegang vereist" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ---- ACTION: scan ----
    if (action === "scan") {
      const { disease_areas } = body;

      // Fetch existing drugs for comparison
      const { data: existingDrugs } = await supabase.from("drugs").select("generic_name, drug_class, disease_areas");
      const existingNames = (existingDrugs || []).map((d: any) => d.generic_name.toLowerCase());

      const areasToScan = disease_areas?.length
        ? disease_areas
        : [
            "Borstkanker",
            "Prostaatkanker",
            "Blaaskanker",
            "Niercelcarcinoom",
            "NSCLC",
            "SCLC",
            "Mesothelioom",
            "Ovariumcarcinoom",
            "Endometriumcarcinoom",
            "Cervixcarcinoom",
          ];

      const systemPrompt = `Je bent een expert oncoloog en klinisch farmacoloog die gespecialiseerd is in oncologische therapieën in België en Europa.

Je taak: Identificeer NIEUWE oncologische therapieën (medicijnen, combinatieschema's, immunotherapieën) die recent zijn goedgekeurd of in de pijplijn zitten voor de opgegeven ziektegebieden. Focus op:

1. **Recente EMA/FDA-goedkeuringen** (2023-2025)
2. **RIZIV/INAMI terugbetalingen** in België
3. **ESMO/ASCO richtlijnen** updates
4. **PubMed publicaties** van pivotale fase III studies
5. **Nieuwe combinatieschema's** die in de klinische praktijk worden gebruikt

Bestaande medicijnen in onze database (NIET opnieuw voorstellen):
${existingNames.join(", ")}

Genereer ALLEEN therapieën die NIET in bovenstaande lijst staan.`;

      const userPrompt = `Scan voor nieuwe oncologische therapieën in deze ziektegebieden: ${areasToScan.join(", ")}.

Geef voor elke gevonden therapie de volgende informatie in het opgegeven JSON-schema. Wees zo specifiek en accuraat mogelijk.
Geef maximaal 15 relevante nieuwe therapieën. Als er geen nieuwe zijn, geef een lege array.`;

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
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_new_therapies",
                description: "Report newly discovered oncology therapies",
                parameters: {
                  type: "object",
                  properties: {
                    therapies: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          generic_name: { type: "string", description: "Generic name or regimen name" },
                          brand_names: { type: "array", items: { type: "string" }, description: "Brand/trade names" },
                          drug_class: {
                            type: "string",
                            enum: [
                              "Immunotherapie (IO/ICI)",
                              "PARPi",
                              "ARPI",
                              "Chemotherapie",
                              "TKI",
                              "ADC",
                              "Radioligand Therapie",
                              "Hormonale Therapie",
                              "Antiresorptiva",
                              "Combinatietherapie",
                              "Supportive Care",
                              "HER2-remmers",
                              "CDK4/6i",
                              "ALK-remmer",
                              "EGFR-remmer",
                              "Angiogeneseremmer",
                            ],
                          },
                          mechanism_of_action: { type: "string" },
                          disease_areas: { type: "array", items: { type: "string" } },
                          approved_indications: { type: "array", items: { type: "string" } },
                          administration_route: { type: "string", enum: ["Oraal", "Intraveneus", "Subcutaan", "Intramusculair"] },
                          is_on_zvz: { type: "boolean", description: "Terugbetaald via RIZIV in België" },
                          source: { type: "string", description: "Bron: PubMed ID, RIZIV-beslissing, ESMO richtlijn, etc." },
                          evidence_level: { type: "string", enum: ["Fase III", "Fase II", "Richtlijn", "EMA-goedgekeurd", "RIZIV-terugbetaald"] },
                          rationale: { type: "string", description: "Korte uitleg waarom deze therapie relevant is" },
                        },
                        required: ["generic_name", "drug_class", "disease_areas", "source", "rationale"],
                      },
                    },
                    scan_summary: { type: "string", description: "Samenvatting van de scan" },
                  },
                  required: ["therapies", "scan_summary"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_new_therapies" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer later opnieuw" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await response.text();
        throw new Error(`AI gateway error: ${response.status} - ${errText}`);
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("Geen resultaten van AI-analyse");

      const result = JSON.parse(toolCall.function.arguments);

      // Log the scan action
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      await supabase.from("audit_log").insert({
        user_id: user.id,
        username: profileData?.username || null,
        action: "auto_update_scan",
        entity_type: "drug",
        details: {
          disease_areas: areasToScan,
          therapies_found: result.therapies?.length || 0,
          scan_summary: result.scan_summary,
        },
      });

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: add ----
    if (action === "add") {
      const { therapies } = body;
      if (!therapies?.length) {
        return new Response(JSON.stringify({ error: "Geen therapieën opgegeven" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      // Fetch all existing drug names for duplicate check
      const { data: allExisting } = await supabase.from("drugs").select("generic_name");
      const existingNamesSet = new Set((allExisting || []).map((d: any) => d.generic_name.toLowerCase().trim()));

      const added: string[] = [];
      const errors: string[] = [];
      const skipped: string[] = [];

      for (const therapy of therapies) {
        // Duplicate check
        if (existingNamesSet.has(therapy.generic_name.toLowerCase().trim())) {
          skipped.push(therapy.generic_name);
          continue;
        }

        const drugData = {
          generic_name: therapy.generic_name,
          brand_names: therapy.brand_names || [],
          drug_class: therapy.drug_class,
          mechanism_of_action: therapy.mechanism_of_action || null,
          disease_areas: therapy.disease_areas || [],
          approved_indications: therapy.approved_indications || [],
          administration_route: therapy.administration_route || null,
          is_on_zvz: therapy.is_on_zvz || false,
          reference_links: therapy.source ? [therapy.source] : [],
        };

        const { error: insertError } = await supabase.from("drugs").insert(drugData);

        if (insertError) {
          errors.push(`${therapy.generic_name}: ${insertError.message}`);
        } else {
          added.push(therapy.generic_name);

          // Log each addition
          await supabase.from("audit_log").insert({
            user_id: user.id,
            username: profileData?.username || null,
            action: "auto_update_add",
            entity_type: "drug",
            entity_name: therapy.generic_name,
            details: {
              drug_class: therapy.drug_class,
              disease_areas: therapy.disease_areas,
              source: therapy.source,
              evidence_level: therapy.evidence_level,
              method: "auto-update",
            },
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, added, errors, skipped }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Onbekende actie" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
