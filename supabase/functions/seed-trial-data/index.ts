import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trial_id } = await req.json();

    if (!trial_id) {
      return new Response(
        JSON.stringify({ error: "trial_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch trial data
    const { data: trial, error: trialError } = await supabase
      .from("trials")
      .select("*")
      .eq("id", trial_id)
      .single();

    if (trialError || !trial) throw new Error("Trial not found");

    // Check if arms/endpoints already exist
    const { data: existingArms } = await supabase.from("arms").select("id").eq("trial_id", trial_id);
    const { data: existingEndpoints } = await supabase.from("endpoints").select("id").eq("trial_id", trial_id);

    if (existingArms && existingArms.length > 0) {
      return new Response(
        JSON.stringify({ message: "Trial already has arms data", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a clinical oncology expert. Based on the trial information provided, generate realistic arms and endpoints data.
For each trial, create:
1. Treatment arms (experimental and control)
2. Endpoints with realistic hazard ratios, confidence intervals, p-values, and median survival times based on the trial type and drugs used.

Use clinically plausible values based on the disease area and intervention type.`;

    const trialContext = `
Trial: ${trial.acronym}
Title: ${trial.title}
Disease: ${trial.disease_area}
Phase: ${trial.phase}
Setting: ${trial.setting}
Drugs: ${trial.drugs?.join(", ") || "Not specified"}
Intervention classes: ${trial.intervention_classes?.join(", ") || "Not specified"}
Primary endpoint: ${trial.primary_endpoint || "OS or PFS"}
Sample size: ${trial.sample_size || 500}
`;

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
          { role: "user", content: `Generate arms and endpoints data for this trial:\n${trialContext}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_trial_data",
              description: "Create arms and endpoints for a clinical trial",
              parameters: {
                type: "object",
                properties: {
                  arms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        treatment_details: { type: "string" },
                        sample_size: { type: "number" }
                      },
                      required: ["name"]
                    }
                  },
                  endpoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        endpoint_name: { type: "string", description: "e.g., Overall Survival, Progression-Free Survival" },
                        endpoint_type: { type: "string", enum: ["primary", "secondary", "exploratory"] },
                        hazard_ratio: { type: "number", description: "HR value, typically 0.5-1.2" },
                        hazard_ratio_ci_lower: { type: "number" },
                        hazard_ratio_ci_upper: { type: "number" },
                        p_value: { type: "number" },
                        median_months: { type: "number", description: "Median survival in months" },
                        rate_percent: { type: "number", description: "Rate at specific timepoint" },
                        rate_timepoint_months: { type: "number" },
                        survival_timepoints: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              months: { type: "number" },
                              survival_rate: { type: "number", description: "0-100 percentage" },
                              arm: { type: "string" }
                            }
                          }
                        }
                      },
                      required: ["endpoint_name", "endpoint_type"]
                    }
                  }
                },
                required: ["arms", "endpoints"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_trial_data" } }
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
    
    if (!toolCall) throw new Error("No data generated");
    
    const { arms, endpoints } = JSON.parse(toolCall.function.arguments);

    // Insert arms
    const armInserts = arms.map((arm: any) => ({
      trial_id,
      name: arm.name,
      description: arm.description,
      treatment_details: arm.treatment_details,
      sample_size: arm.sample_size
    }));

    const { data: insertedArms, error: armsError } = await supabase
      .from("arms")
      .insert(armInserts)
      .select();

    if (armsError) throw new Error(`Failed to insert arms: ${armsError.message}`);

    // Create arm name to ID mapping
    const armIdMap: Record<string, string> = {};
    insertedArms?.forEach(arm => {
      armIdMap[arm.name.toLowerCase()] = arm.id;
    });

    // Insert endpoints
    const endpointInserts = endpoints.map((ep: any) => ({
      trial_id,
      endpoint_name: ep.endpoint_name,
      endpoint_type: ep.endpoint_type,
      hazard_ratio: ep.hazard_ratio,
      hazard_ratio_ci_lower: ep.hazard_ratio_ci_lower,
      hazard_ratio_ci_upper: ep.hazard_ratio_ci_upper,
      p_value: ep.p_value,
      median_months: ep.median_months,
      rate_percent: ep.rate_percent,
      rate_timepoint_months: ep.rate_timepoint_months,
      survival_timepoints: ep.survival_timepoints
    }));

    const { data: insertedEndpoints, error: endpointsError } = await supabase
      .from("endpoints")
      .insert(endpointInserts)
      .select();

    if (endpointsError) throw new Error(`Failed to insert endpoints: ${endpointsError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        arms_added: insertedArms?.length || 0,
        endpoints_added: insertedEndpoints?.length || 0
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
