import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.oncoinfo.be",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     // Check admin role
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

     const { trial_id, analysis_type = "full" } = await req.json();
     
    if (!trial_id) {
      return new Response(
        JSON.stringify({ error: "trial_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch trial data with arms and endpoints
    const { data: trial, error: trialError } = await supabase
      .from("trials")
      .select("*")
      .eq("id", trial_id)
      .single();

    if (trialError || !trial) throw new Error("Trial not found");

    const { data: arms } = await supabase.from("arms").select("*").eq("trial_id", trial_id);
    const { data: endpoints } = await supabase.from("endpoints").select("*").eq("trial_id", trial_id);

    const trialContext = `
TRIAL: ${trial.acronym}
Title: ${trial.title}
Disease: ${trial.disease_area}
Phase: ${trial.phase || "Not specified"}
Setting: ${trial.setting || "Not specified"}
Line of therapy: ${trial.line_of_therapy || "Not specified"}
Design: ${trial.design_type || "Not specified"}
Randomization: ${trial.randomization || "Not specified"}
Blinding: ${trial.blinding || "Not specified"}
Sample size: ${trial.sample_size || "Not specified"}

Primary endpoint: ${trial.primary_endpoint || "Not specified"}
Secondary endpoints: ${trial.secondary_endpoints?.join(", ") || "Not specified"}

Intervention classes: ${trial.intervention_classes?.join(", ") || "Not specified"}
Drugs: ${trial.drugs?.join(", ") || "Not specified"}
Biomarkers: ${trial.biomarkers?.join(", ") || "Not specified"}

Treatment Arms:
${arms?.map(a => `- ${a.name}: ${a.description || a.treatment_details || "No details"}`).join("\n") || "No arms data"}

Endpoints/Results:
${endpoints?.map(e => `- ${e.endpoint_name} (${e.endpoint_type}): HR=${e.hazard_ratio || "N/A"}, CI=[${e.hazard_ratio_ci_lower || "N/A"}-${e.hazard_ratio_ci_upper || "N/A"}], p=${e.p_value || "N/A"}, Median=${e.median_months || "N/A"}mo`).join("\n") || "No endpoint data"}

Results summary: ${JSON.stringify(trial.results_summary) || "Not available"}
Safety highlights: ${trial.safety_highlights || "Not available"}
Abstract: ${trial.abstract || "Not available"}
`;

    const systemPrompt = `You are an expert clinical oncology researcher specializing in GU (genitourinary) oncology trials.
Analyze the clinical trial data provided and generate comprehensive analysis including:
1. Design analysis (strengths of study design, methodology assessment)
2. Strengths (what makes this trial valuable, robust methodology, clinical relevance)
3. Weaknesses (limitations, potential biases, methodological concerns)
4. Clinical implications (how results impact clinical practice)
5. Patient impact summary (what this means for patients in simple terms)

Be specific, evidence-based, and clinically relevant in your analysis.`;

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
          { role: "user", content: `Analyze this clinical trial:\n\n${trialContext}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_analysis",
              description: "Generate structured trial analysis",
              parameters: {
                type: "object",
                properties: {
                  design_summary: {
                    type: "object",
                    properties: {
                      phase: { type: "string" },
                      randomization: { type: "string" },
                      stratification: { type: "array", items: { type: "string" } },
                      blinding: { type: "string" },
                      population: { type: "string" },
                      treatment_arms: { type: "array", items: { type: "string" } },
                      endpoints: { type: "array", items: { type: "string" } },
                      statistics: { type: "string" }
                    }
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of trial strengths (3-6 items)"
                  },
                  weaknesses: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of trial weaknesses/limitations (3-6 items)"
                  },
                  overall_assessment: {
                    type: "string",
                    description: "Brief overall assessment of trial quality and impact"
                  },
                  clinical_implications: {
                    type: "array",
                    items: { type: "string" },
                    description: "How results impact clinical practice (2-4 items)"
                  },
                  layman_summary: {
                    type: "string",
                    description: "Plain language summary for patients (2-3 paragraphs)"
                  }
                },
                required: ["strengths", "weaknesses", "overall_assessment", "clinical_implications", "layman_summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_analysis" } }
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
    
    if (!toolCall) throw new Error("No analysis generated");
    
    const analysis = JSON.parse(toolCall.function.arguments);

    // Save to ai_summaries table
    // First, mark existing summaries as not current
    await supabase
      .from("ai_summaries")
      .update({ is_current: false })
      .eq("trial_id", trial_id);

    // Insert new design summary
    if (analysis.design_summary) {
      await supabase.from("ai_summaries").insert({
        trial_id,
        summary_type: "design",
        content: analysis.design_summary,
        is_current: true
      });
    }

    // Insert strengths/weaknesses
    await supabase.from("ai_summaries").insert({
      trial_id,
      summary_type: "strengths_weaknesses",
      content: {
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        overall_assessment: analysis.overall_assessment,
        clinical_implications: analysis.clinical_implications,
        layman_summary: analysis.layman_summary
      },
      is_current: true
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
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
