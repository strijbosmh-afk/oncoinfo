import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculateNextRun(interval: string): string {
  const now = new Date();
  switch (interval) {
    case "weekly": now.setDate(now.getDate() + 7); break;
    case "monthly": now.setMonth(now.getMonth() + 1); break;
    case "quarterly": now.setMonth(now.getMonth() + 3); break;
  }
  return now.toISOString();
}

async function runScan(supabase: any, aiGatewayApiKey: string, diseaseAreas?: string[]) {
  const { data: existingDrugs } = await supabase.from("drugs").select("generic_name, drug_class, disease_areas");
  const existingNames = (existingDrugs || []).map((d: any) => d.generic_name.toLowerCase());

  const areasToScan = diseaseAreas?.length
    ? diseaseAreas
    : [
        "Borstkanker", "Prostaatkanker", "Blaaskanker", "Niercelcarcinoom",
        "NSCLC", "SCLC", "Mesothelioom",
        "Ovariumcarcinoom", "Endometriumcarcinoom", "Cervixcarcinoom",
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

  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiGatewayApiKey}`,
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
                          "Immunotherapie (IO/ICI)", "PARPi", "ARPI", "Chemotherapie", "TKI",
                          "ADC", "Radioligand Therapie", "Hormonale Therapie", "Antiresorptiva",
                          "Combinatietherapie", "Supportive Care", "HER2-remmers", "CDK4/6i",
                          "ALK-remmer", "EGFR-remmer", "Angiogeneseremmer",
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
    if (response.status === 429) throw new Error("Rate limit bereikt, probeer later opnieuw");
    const errText = await response.text();
    throw new Error(`AI gateway error: ${response.status} - ${errText}`);
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Geen resultaten van AI-analyse");

  return JSON.parse(toolCall.function.arguments);
}

async function addTherapies(supabase: any, therapies: any[], userId: string) {
  const { data: allExisting } = await supabase.from("drugs").select("generic_name");
  const existingNamesSet = new Set((allExisting || []).map((d: any) => d.generic_name.toLowerCase().trim()));

  const { data: profileData } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", userId)
    .single();

  const added: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const therapy of therapies) {
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
      existingNamesSet.add(therapy.generic_name.toLowerCase().trim());

      await supabase.from("audit_log").insert({
        user_id: userId,
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

  return { added, errors, skipped };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");

    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY not configured");

    const body = await req.json();
    const { action } = body;

    // ---- Scheduled cron action (no user auth needed) ----
    if (action === "run-scheduled") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: dueSchedules, error: schedError } = await supabase
        .from("scheduled_auto_updates")
        .select("*")
        .eq("is_active", true)
        .lte("next_run_at", new Date().toISOString());

      if (schedError) throw new Error(schedError.message);
      if (!dueSchedules?.length) {
        return new Response(JSON.stringify({ message: "No schedules due" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: any[] = [];

      for (const schedule of dueSchedules) {
        try {
          const scanResult = await runScan(supabase, AI_GATEWAY_API_KEY, schedule.disease_areas?.length ? schedule.disease_areas : undefined);

          let addResult = { added: [] as string[], errors: [] as string[], skipped: [] as string[] };
          if (scanResult.therapies?.length > 0) {
            addResult = await addTherapies(supabase, scanResult.therapies, schedule.created_by);
          }

          const nextRun = calculateNextRun(schedule.schedule_interval);

          await supabase
            .from("scheduled_auto_updates")
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun,
              run_count: (schedule.run_count || 0) + 1,
              last_result: {
                added: addResult.added,
                skipped: addResult.skipped,
                errors: addResult.errors,
                therapies_found: scanResult.therapies?.length || 0,
              },
            })
            .eq("id", schedule.id);

          await supabase.from("audit_log").insert({
            user_id: schedule.created_by,
            username: "system (scheduled)",
            action: "scheduled_auto_update",
            entity_type: "drug",
            details: {
              schedule_id: schedule.id,
              interval: schedule.schedule_interval,
              therapies_found: scanResult.therapies?.length || 0,
              added: addResult.added.length,
              skipped: addResult.skipped.length,
              errors: addResult.errors.length,
            },
          });

          results.push({ schedule_id: schedule.id, success: true, added: addResult.added.length });
        } catch (err) {
          results.push({ schedule_id: schedule.id, success: false, error: err instanceof Error ? err.message : "Unknown" });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Auth for interactive actions ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("apotheker") && !userRoles.includes("super_admin")) {
      return new Response(JSON.stringify({ error: "Admin of apotheker toegang vereist" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: scan ----
    if (action === "scan") {
      const { disease_areas } = body;
      const result = await runScan(supabase, AI_GATEWAY_API_KEY, disease_areas);

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
          disease_areas: disease_areas || "all",
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

      const result = await addTherapies(supabase, therapies, user.id);

      return new Response(
        JSON.stringify({ success: true, ...result }),
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
