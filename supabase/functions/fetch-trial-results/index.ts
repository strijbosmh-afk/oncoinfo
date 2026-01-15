import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get trial(s) to process
    let trialsQuery = supabase.from("trials").select("*");
    if (trial_id) {
      trialsQuery = trialsQuery.eq("id", trial_id);
    }
    
    const { data: trials, error: trialsError } = await trialsQuery;
    if (trialsError) throw trialsError;
    if (!trials || trials.length === 0) {
      return new Response(
        JSON.stringify({ error: "No trials found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const trial of trials) {
      console.log(`Processing trial: ${trial.acronym}`);
      
      // Skip if no pubmed_id
      if (!trial.pubmed_id) {
        console.log(`Skipping ${trial.acronym} - no PubMed ID`);
        continue;
      }

      // Check if arms/endpoints already exist
      const { data: existingArms } = await supabase
        .from("arms")
        .select("id")
        .eq("trial_id", trial.id);
      
      const { data: existingEndpoints } = await supabase
        .from("endpoints")
        .select("id")
        .eq("trial_id", trial.id);

      if ((existingArms?.length || 0) > 0 && (existingEndpoints?.length || 0) > 0) {
        console.log(`Skipping ${trial.acronym} - already has arms and endpoints`);
        continue;
      }

      // Fetch abstract from PubMed
      let abstract = trial.abstract || "";
      if (!abstract && trial.pubmed_id) {
        try {
          const pubmedResponse = await fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${trial.pubmed_id}&retmode=xml`
          );
          if (pubmedResponse.ok) {
            const xml = await pubmedResponse.text();
            const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
            if (abstractMatch) {
              abstract = abstractMatch.map(a => a.replace(/<[^>]+>/g, '')).join(' ');
            }
          }
        } catch (e) {
          console.error("PubMed fetch error:", e);
        }
      }

      if (!abstract) {
        console.log(`Skipping ${trial.acronym} - no abstract available`);
        continue;
      }

      // Use AI to extract structured results from abstract
      const systemPrompt = `You are a clinical trial data extraction expert. Extract ONLY factual data that is explicitly stated in the abstract. Do NOT make up or estimate any values. If a value is not mentioned, set it to null.

For survival timepoints, ONLY include if explicit percentages at specific time points are mentioned (e.g., "2-year OS was 78%").
For hazard ratios, ONLY include if explicitly stated with the exact value.
For confidence intervals, ONLY include if explicitly stated.
For p-values, ONLY include if explicitly stated.

Be extremely conservative - it's better to have null values than incorrect data.`;

      const userPrompt = `Extract trial results from this abstract for the ${trial.acronym} trial:

Title: ${trial.title}
Abstract: ${abstract}

Extract the treatment arms and their endpoints with ONLY explicitly stated values.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_trial_results",
              description: "Extract structured trial results from abstract",
              parameters: {
                type: "object",
                properties: {
                  arms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Arm name (e.g., 'Enzalutamide + ADT', 'Placebo + ADT')" },
                        description: { type: "string", description: "Brief description of the arm" },
                        sample_size: { type: ["number", "null"], description: "Number of patients if stated" },
                        treatment_details: { type: "string", description: "Treatment protocol details if stated" }
                      },
                      required: ["name"]
                    }
                  },
                  endpoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        arm_name: { type: "string", description: "Which arm this endpoint belongs to" },
                        endpoint_name: { type: "string", description: "Name of endpoint (e.g., 'Overall Survival', 'rPFS')" },
                        endpoint_type: { type: "string", enum: ["primary", "secondary", "exploratory"] },
                        hazard_ratio: { type: ["number", "null"], description: "HR if explicitly stated" },
                        hazard_ratio_ci_lower: { type: ["number", "null"], description: "Lower bound of 95% CI if stated" },
                        hazard_ratio_ci_upper: { type: ["number", "null"], description: "Upper bound of 95% CI if stated" },
                        p_value: { type: ["number", "null"], description: "P-value if stated (e.g., 0.001)" },
                        median_months: { type: ["number", "null"], description: "Median survival/PFS in months if stated" },
                        rate_percent: { type: ["number", "null"], description: "Rate percentage if stated (e.g., 2-year OS rate)" },
                        rate_timepoint_months: { type: ["number", "null"], description: "Timepoint for rate in months" },
                        survival_timepoints: {
                          type: ["array", "null"],
                          description: "Only include if specific survival percentages at time points are mentioned",
                          items: {
                            type: "object",
                            properties: {
                              months: { type: "number" },
                              survival_rate: { type: "number", description: "As decimal 0-1" }
                            }
                          }
                        }
                      },
                      required: ["arm_name", "endpoint_name", "endpoint_type"]
                    }
                  },
                  results_summary: {
                    type: "object",
                    properties: {
                      enrollment: { type: ["number", "null"] },
                      primary_outcome: { type: "string" },
                      key_findings: { type: "array", items: { type: "string" } },
                      conclusions: { type: "string" }
                    }
                  }
                },
                required: ["arms", "endpoints"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "extract_trial_results" } }
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI error for ${trial.acronym}:`, errorText);
        continue;
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) {
        console.error(`No tool call response for ${trial.acronym}`);
        continue;
      }

      const extractedData = JSON.parse(toolCall.function.arguments);
      console.log(`Extracted data for ${trial.acronym}:`, JSON.stringify(extractedData).substring(0, 500));

      // Insert arms
      const armIdMap: Record<string, string> = {};
      if (extractedData.arms && extractedData.arms.length > 0) {
        for (const arm of extractedData.arms) {
          const { data: insertedArm, error: armError } = await supabase
            .from("arms")
            .insert({
              trial_id: trial.id,
              name: arm.name,
              description: arm.description || null,
              sample_size: arm.sample_size || null,
              treatment_details: arm.treatment_details || null
            })
            .select("id")
            .single();

          if (armError) {
            console.error(`Error inserting arm for ${trial.acronym}:`, armError);
          } else {
            armIdMap[arm.name] = insertedArm.id;
          }
        }
      }

      // Insert endpoints
      if (extractedData.endpoints && extractedData.endpoints.length > 0) {
        for (const endpoint of extractedData.endpoints) {
          const armId = armIdMap[endpoint.arm_name] || null;
          
          const { error: endpointError } = await supabase
            .from("endpoints")
            .insert({
              trial_id: trial.id,
              arm_id: armId,
              endpoint_name: endpoint.endpoint_name,
              endpoint_type: endpoint.endpoint_type,
              hazard_ratio: endpoint.hazard_ratio || null,
              hazard_ratio_ci_lower: endpoint.hazard_ratio_ci_lower || null,
              hazard_ratio_ci_upper: endpoint.hazard_ratio_ci_upper || null,
              p_value: endpoint.p_value || null,
              median_months: endpoint.median_months || null,
              rate_percent: endpoint.rate_percent || null,
              rate_timepoint_months: endpoint.rate_timepoint_months || null,
              survival_timepoints: endpoint.survival_timepoints || null
            });

          if (endpointError) {
            console.error(`Error inserting endpoint for ${trial.acronym}:`, endpointError);
          }
        }
      }

      // Update trial results_summary
      if (extractedData.results_summary) {
        await supabase
          .from("trials")
          .update({ 
            results_summary: extractedData.results_summary,
            abstract: abstract
          })
          .eq("id", trial.id);
      }

      results.push({
        trial_id: trial.id,
        acronym: trial.acronym,
        arms_added: Object.keys(armIdMap).length,
        endpoints_added: extractedData.endpoints?.length || 0
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
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
