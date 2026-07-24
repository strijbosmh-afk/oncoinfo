import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrialData {
  acronym: string;
  title: string;
  disease_area: string;
  setting?: string;
  line_of_therapy?: string;
  phase?: string;
  design_type?: string;
  randomization?: string;
  blinding?: string;
  sample_size?: number;
  primary_endpoint?: string;
  secondary_endpoints?: string[];
  intervention_classes?: string[];
  drugs?: string[];
  biomarkers?: string[];
  results_summary?: {
    enrollment?: number;
    primary_outcome?: string;
    key_findings?: string[];
    conclusions?: string;
  };
  safety_highlights?: string;
  pubmed_id?: string;
  doi?: string;
  journal?: string;
  publication_year?: number;
  authors?: string[];
  abstract?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
     // Authenticate and authorize admin user
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
     
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
 
     // Check admin role using service client
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
     if (!SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Supabase service role key is missing");
     }
 
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     const { data: profile } = await supabase
       .from("profiles")
       .select("role")
       .eq("user_id", user.id)
       .single();
 
     if (profile?.role !== "admin") {
       return new Response(
         JSON.stringify({ error: "Admin access required" }),
         { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
    const { disease_area, year_from = 2015 } = await req.json();

    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");

    if (!AI_GATEWAY_API_KEY) {
      throw new Error("AI_GATEWAY_API_KEY is not configured");
    }

    // Get existing trial acronyms to avoid duplicates
    const { data: existingTrials } = await supabase
      .from("trials")
      .select("acronym, pubmed_id")
      .order("acronym");

    const existingAcronyms = new Set(existingTrials?.map(t => t.acronym.toUpperCase()) || []);
    const existingPubmedIds = new Set(existingTrials?.filter(t => t.pubmed_id).map(t => t.pubmed_id) || []);

    const diseasePrompt = disease_area 
      ? `Focus specifically on ${disease_area} trials.`
      : `Cover all GU oncology areas: Prostate Cancer, Bladder Cancer, Renal Cell Carcinoma, Testicular Cancer, and Penile Cancer.`;

    const systemPrompt = `You are a clinical oncology trials expert specializing in genitourinary (GU) oncology. 
Your task is to identify the most important and impactful clinical trials published between ${year_from} and 2025.
${diseasePrompt}

Focus on:
- Phase III trials with practice-changing results
- Key Phase II trials that led to drug approvals
- Landmark immunotherapy trials (IO/ICI)
- Important targeted therapy trials (PARPi, ARPI, ADC)
- Notable radioligand therapy trials
- Significant combination therapy trials

For each trial, provide comprehensive structured data including:
- Accurate trial acronym and full title
- Disease area (exactly one of: Prostate Cancer, Bladder Cancer, Renal Cell Carcinoma, Testicular Cancer, Penile Cancer)
- Setting (Localized, Locally Advanced, Metastatic, Adjuvant, Neoadjuvant, Maintenance, Salvage)
- Phase, design type, randomization, blinding
- Sample size and key endpoints
- Intervention classes and specific drugs used
- Results summary with key findings
- PubMed ID if known

Return ONLY trials that are NOT in this list of existing acronyms: ${Array.from(existingAcronyms).slice(0, 200).join(", ")}`;

    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Please identify 20 important GU oncology clinical trials from ${year_from}-2025 that should be added to our database. Return them as structured data.` 
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "add_trials",
              description: "Add new clinical trials to the database",
              parameters: {
                type: "object",
                properties: {
                  trials: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        acronym: { type: "string", description: "Trial acronym (e.g., KEYNOTE-052)" },
                        title: { type: "string", description: "Full trial title" },
                        disease_area: { type: "string", enum: ["Prostate Cancer", "Bladder Cancer", "Renal Cell Carcinoma", "Testicular Cancer", "Penile Cancer"] },
                        setting: { type: "string", enum: ["Localized", "Locally Advanced", "Metastatic", "Adjuvant", "Neoadjuvant", "Maintenance", "Salvage"] },
                        line_of_therapy: { type: "string" },
                        phase: { type: "string", enum: ["Phase I", "Phase I/II", "Phase II", "Phase II/III", "Phase III", "Phase IV"] },
                        design_type: { type: "string" },
                        randomization: { type: "string" },
                        blinding: { type: "string" },
                        sample_size: { type: "number" },
                        primary_endpoint: { type: "string" },
                        secondary_endpoints: { type: "array", items: { type: "string" } },
                        intervention_classes: { type: "array", items: { type: "string" } },
                        drugs: { type: "array", items: { type: "string" } },
                        biomarkers: { type: "array", items: { type: "string" } },
                        results_summary: {
                          type: "object",
                          properties: {
                            enrollment: { type: "number" },
                            primary_outcome: { type: "string" },
                            key_findings: { type: "array", items: { type: "string" } },
                            conclusions: { type: "string" }
                          }
                        },
                        safety_highlights: { type: "string" },
                        pubmed_id: { type: "string" },
                        doi: { type: "string" },
                        journal: { type: "string" },
                        publication_year: { type: "number" },
                        authors: { type: "array", items: { type: "string" } },
                        abstract: { type: "string" }
                      },
                      required: ["acronym", "title", "disease_area"]
                    }
                  }
                },
                required: ["trials"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "add_trials" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received", {
      choices: Array.isArray(aiResponse.choices) ? aiResponse.choices.length : 0,
    });

    // Extract trials from tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "add_trials") {
      throw new Error("Unexpected AI response format");
    }

    const { trials } = JSON.parse(toolCall.function.arguments);
    
    // Filter out duplicates
    const newTrials = trials.filter((trial: TrialData) => {
      const isDuplicate = existingAcronyms.has(trial.acronym.toUpperCase()) ||
        (trial.pubmed_id && existingPubmedIds.has(trial.pubmed_id));
      return !isDuplicate;
    });

    if (newTrials.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No new trials to add - all suggested trials already exist in database",
          added: 0,
          suggested: trials.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new trials
    const { data: insertedTrials, error: insertError } = await supabase
      .from("trials")
      .insert(newTrials)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert trials: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: `Successfully added ${insertedTrials?.length || 0} new trials`,
        added: insertedTrials?.length || 0,
        suggested: trials.length,
        trials: insertedTrials?.map(t => ({ acronym: t.acronym, title: t.title }))
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
