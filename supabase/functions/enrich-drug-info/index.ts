import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AIClientError, callAIToolJson, z } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DrugInfoSchema = z.object({
  generic_name: z.string().min(1),
  brand_names: z.string().optional(),
  drug_class: z.string().optional(),
  mechanism_of_action: z.string().optional(),
  disease_areas: z.array(z.string()).optional(),
  administration_route: z.string().optional(),
  standard_dose: z.string().optional(),
  dosing_frequency: z.string().optional(),
  cycle_length_days: z.number().optional(),
  approved_indications: z.array(z.string()).optional(),
  registration_trial: z.string().optional(),
});

const DRUG_INFO_TOOL = {
  type: "function",
  function: {
    name: "provide_drug_info",
    description: "Provide structured oncology drug information",
    parameters: {
      type: "object",
      properties: {
        generic_name: { type: "string", description: "Generic/INN name of the drug" },
        brand_names: { type: "string", description: "Comma-separated brand names, prioritize Belgian market names" },
        drug_class: { type: "string", description: "Drug class, e.g. IO/ICI, PARPi, Chemotherapie, TKI" },
        mechanism_of_action: { type: "string", description: "Mechanism of action in Dutch" },
        disease_areas: {
          type: "array",
          items: { type: "string" },
          description: "Disease areas in Dutch, e.g. Prostaatkanker, Borstkanker, NSCLC",
        },
        administration_route: { type: "string", description: "Route: IV, PO, SC, IM, or Intravesicaal" },
        standard_dose: { type: "string", description: "Standard dosage, e.g. 200 mg" },
        dosing_frequency: { type: "string", description: "Frequency, e.g. q3w, dagelijks, q2w" },
        cycle_length_days: { type: "number", description: "Cycle length in days, e.g. 21 for q3w" },
        approved_indications: {
          type: "array",
          items: { type: "string" },
          description: "EMA-approved indications in Dutch",
        },
        registration_trial: { type: "string", description: "Pivotal registration trial name/acronym. Empty if unknown." },
      },
      required: ["generic_name"],
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { drug_name } = await req.json();
    if (!drug_name || typeof drug_name !== "string" || drug_name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Drug name is required (min 2 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI_GATEWAY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Je bent een oncologisch farmaceutisch expert met kennis van de Belgische markt. Gegeven een medicijnnaam, geef gestructureerde informatie terug over dit oncologisch geneesmiddel.

Antwoord altijd in het Nederlands. Geef alleen informatie waarvan je zeker bent. Als je iets niet weet, laat het veld leeg.
Geef bij merknamen de naam die in Belgie wordt gebruikt/verkocht.
Geef bij dosering de standaarddosering voor de meest voorkomende oncologische indicatie.

Gebruik tool calling om je antwoord te structureren.`;

    const userPrompt = `Geef gedetailleerde oncologische informatie over het geneesmiddel: "${drug_name.trim()}"

Denk aan: generieke naam, merknamen, medicijnklasse, werkingsmechanisme, ziektegebieden, toedieningsweg, standaarddosering, frequentie, cyclusduur, goedgekeurde indicaties en registratiestudie.`;

    const drugInfo = await callAIToolJson({
      operation: "enrich_drug_info",
      apiKey,
      model: "google/gemini-2.5-flash",
      timeoutMs: 30_000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [DRUG_INFO_TOOL],
      tool_choice: { type: "function", function: { name: "provide_drug_info" } },
      schema: DrugInfoSchema,
    });

    return new Response(JSON.stringify({ success: true, drug: drugInfo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("enrich-drug-info error:", error instanceof Error ? error.name : "UnknownError");
    if (error instanceof AIClientError) {
      return new Response(JSON.stringify({ error: error.userMessage }), {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
