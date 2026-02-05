import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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
 
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
 
     const authClient = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const { data: { user }, error: authError } = await authClient.auth.getUser();
     if (authError || !user) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
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
 
     const { trial_id, force_refresh = false } = await req.json();

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

      // Check if already processed (unless force_refresh)
      if (!force_refresh) {
        const { data: existingArms } = await supabase
          .from("arms")
          .select("id")
          .eq("trial_id", trial.id);
        
        const { data: existingEndpoints } = await supabase
          .from("endpoints")
          .select("id")
          .eq("trial_id", trial.id);

        if ((existingArms?.length || 0) > 0 && (existingEndpoints?.length || 0) > 0 && trial.results_summary) {
          console.log(`Skipping ${trial.acronym} - already has data`);
          continue;
        }
      } else {
        // Delete existing data for refresh
        await supabase.from("endpoints").delete().eq("trial_id", trial.id);
        await supabase.from("arms").delete().eq("trial_id", trial.id);
      }

      // Fetch full abstract from PubMed
      let abstract = trial.abstract || "";
      let meshTerms: string[] = [];
      let publicationType = "";
      let articleDetails = "";
      
      if (trial.pubmed_id) {
        try {
          const pubmedResponse = await fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${trial.pubmed_id}&retmode=xml`
          );
          if (pubmedResponse.ok) {
            const xml = await pubmedResponse.text();
            
            // Extract abstract
            const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
            if (abstractMatch) {
              abstract = abstractMatch.map(a => {
                // Also extract Label attribute if present
                const labelMatch = a.match(/Label="([^"]+)"/);
                const textContent = a.replace(/<[^>]+>/g, '').trim();
                return labelMatch ? `${labelMatch[1]}: ${textContent}` : textContent;
              }).join('\n\n');
            }
            
            // Extract MeSH terms for better categorization
            const meshMatches = xml.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g);
            meshTerms = Array.from(meshMatches, m => m[1]);
            
            // Extract publication type
            const pubTypeMatch = xml.match(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/);
            if (pubTypeMatch) publicationType = pubTypeMatch[1];
            
            // Extract article title for verification
            const titleMatch = xml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
            if (titleMatch) articleDetails = titleMatch[1];
          }
        } catch (e) {
          console.error("PubMed fetch error:", e);
        }
      }

      if (!abstract) {
        console.log(`Skipping ${trial.acronym} - no abstract available`);
        continue;
      }

      // Use AI to extract structured results AND design summary from abstract
      const systemPrompt = `You are a clinical trial data extraction expert. Your task is to extract ONLY factual data that is explicitly stated in the abstract. 

CRITICAL RULES:
1. Do NOT make up or estimate any values
2. If a value is not explicitly mentioned, set it to null
3. For survival data, ONLY include if explicit percentages at specific time points are mentioned
4. For hazard ratios, confidence intervals, and p-values, ONLY include if explicitly stated
5. Be extremely conservative - null values are better than incorrect data

Also extract the study design elements that are mentioned in the abstract.`;

      const userPrompt = `Extract trial results AND design information from this abstract for the ${trial.acronym} trial:

Title: ${trial.title}
Abstract: ${abstract}
${meshTerms.length > 0 ? `MeSH Terms: ${meshTerms.join(', ')}` : ''}
${publicationType ? `Publication Type: ${publicationType}` : ''}

Extract:
1. Treatment arms with their details
2. Endpoints with ONLY explicitly stated statistical values
3. A results summary with key findings
4. A design summary describing the study methodology`;

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
              name: "extract_trial_data",
              description: "Extract structured trial results and design from abstract",
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
                        arm_name: { type: "string", description: "Which arm this endpoint belongs to, or 'Comparison' for between-arm comparisons" },
                        endpoint_name: { type: "string", description: "Name of endpoint (e.g., 'Overall Survival', 'rPFS', 'ORR')" },
                        endpoint_type: { type: "string", enum: ["primary", "secondary", "exploratory"] },
                        hazard_ratio: { type: ["number", "null"], description: "HR if explicitly stated" },
                        hazard_ratio_ci_lower: { type: ["number", "null"], description: "Lower bound of 95% CI if stated" },
                        hazard_ratio_ci_upper: { type: ["number", "null"], description: "Upper bound of 95% CI if stated" },
                        p_value: { type: ["number", "null"], description: "P-value if stated (e.g., 0.001 for p<0.001)" },
                        median_months: { type: ["number", "null"], description: "Median time in months if stated" },
                        rate_percent: { type: ["number", "null"], description: "Rate percentage if stated" },
                        rate_timepoint_months: { type: ["number", "null"], description: "Timepoint for rate in months" },
                        survival_timepoints: {
                          type: ["array", "null"],
                          description: "Only include if specific survival percentages at time points are mentioned",
                          items: {
                            type: "object",
                            properties: {
                              months: { type: "number" },
                              survival_rate: { type: "number", description: "As percentage 0-100" },
                              arm: { type: "string" }
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
                      enrollment: { type: ["number", "null"], description: "Total number enrolled if stated" },
                      primary_outcome: { type: "string", description: "One sentence summary of primary outcome" },
                      key_findings: { type: "array", items: { type: "string" }, description: "Key statistical findings" },
                      conclusions: { type: "string", description: "Main conclusion from the abstract" }
                    }
                  },
                  design_summary: {
                    type: "object",
                    properties: {
                      phase: { type: "string", description: "Trial phase if mentioned" },
                      design_type: { type: "string", description: "e.g., randomized, open-label, double-blind, single-arm" },
                      randomization: { type: "string", description: "Randomization ratio if stated (e.g., 1:1, 2:1)" },
                      stratification: { type: "array", items: { type: "string" }, description: "Stratification factors if mentioned" },
                      blinding: { type: "string", description: "Blinding status (open-label, single-blind, double-blind)" },
                      population: { type: "string", description: "Brief description of patient population" },
                      setting: { type: "string", description: "Disease setting (e.g., metastatic, locally advanced, adjuvant)" },
                      treatment_arms: { type: "array", items: { type: "string" }, description: "Treatment arm descriptions" },
                      primary_endpoint: { type: "string", description: "Primary endpoint name" },
                      secondary_endpoints: { type: "array", items: { type: "string" }, description: "Key secondary endpoints" },
                      follow_up: { type: "string", description: "Median follow-up if stated" },
                      statistics: { type: "string", description: "Statistical methodology if described" }
                    }
                  }
                },
                required: ["arms", "endpoints", "results_summary", "design_summary"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "extract_trial_data" } }
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

      let extractedData;
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error(`JSON parse error for ${trial.acronym}:`, e);
        continue;
      }
      
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
          } else if (insertedArm) {
            armIdMap[arm.name] = insertedArm.id;
          }
        }
      }

      // Insert endpoints
      if (extractedData.endpoints && extractedData.endpoints.length > 0) {
        for (const endpoint of extractedData.endpoints) {
          const armId = armIdMap[endpoint.arm_name] || null;
          
          // Convert survival rates to decimal if they're percentages
          let survivalTimepoints = endpoint.survival_timepoints;
          if (survivalTimepoints) {
            survivalTimepoints = survivalTimepoints.map((tp: any) => ({
              ...tp,
              survival_rate: tp.survival_rate > 1 ? tp.survival_rate / 100 : tp.survival_rate
            }));
          }
          
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
              survival_timepoints: survivalTimepoints || null
            });

          if (endpointError) {
            console.error(`Error inserting endpoint for ${trial.acronym}:`, endpointError);
          }
        }
      }

      // Update trial with results_summary and design info
      const updateData: any = {
        abstract: abstract,
        updated_at: new Date().toISOString()
      };
      
      if (extractedData.results_summary) {
        updateData.results_summary = extractedData.results_summary;
      }
      
      // Update design fields from design_summary
      if (extractedData.design_summary) {
        const ds = extractedData.design_summary;
        if (ds.phase) updateData.phase = ds.phase;
        if (ds.design_type) updateData.design_type = ds.design_type;
        if (ds.randomization) updateData.randomization = ds.randomization;
        if (ds.blinding) updateData.blinding = ds.blinding;
        if (ds.setting) updateData.setting = ds.setting;
        if (ds.primary_endpoint) updateData.primary_endpoint = ds.primary_endpoint;
        if (ds.secondary_endpoints) updateData.secondary_endpoints = ds.secondary_endpoints;
      }

      await supabase
        .from("trials")
        .update(updateData)
        .eq("id", trial.id);

      // Store design summary in ai_summaries table
      if (extractedData.design_summary) {
        // Set previous design summaries as not current
        await supabase
          .from("ai_summaries")
          .update({ is_current: false })
          .eq("trial_id", trial.id)
          .eq("summary_type", "design");

        await supabase
          .from("ai_summaries")
          .insert({
            trial_id: trial.id,
            summary_type: "design",
            content: extractedData.design_summary,
            is_current: true,
            version: 1
          });
      }

      results.push({
        trial_id: trial.id,
        acronym: trial.acronym,
        arms_added: Object.keys(armIdMap).length,
        endpoints_added: extractedData.endpoints?.length || 0,
        has_results_summary: !!extractedData.results_summary,
        has_design_summary: !!extractedData.design_summary
      });

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
