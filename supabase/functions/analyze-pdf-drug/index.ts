import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AIClientError, callAIToolJson, z } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RegimenSchema = z.object({
  generic_name: z.string().min(1),
  brand_names: z.string().optional(),
  drug_class: z.string().min(1),
  disease_areas: z.array(z.string()).optional(),
  mechanism_of_action: z.string().optional(),
  administration_route: z.string().optional(),
  study_name: z.string().optional(),
  dosing: z.string().optional(),
  side_effects_common: z.array(z.string()).optional(),
  side_effects_serious: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  monitoring: z.string().optional(),
});

const ExtractionSchema = z.object({
  regimens: z.array(RegimenSchema).default([]),
  summary: z.string().default(""),
  is_oncology_relevant: z.boolean().default(false),
  relevance_reason: z.string().optional(),
});

const EXTRACT_TOOL = {
  type: "function",
  function: {
    name: "extract_drug_regimens",
    description: "Beoordeel oncologische relevantie en extraheer medicijnregimens met veiligheidsinformatie",
    parameters: {
      type: "object",
      properties: {
        regimens: {
          type: "array",
          items: {
            type: "object",
            properties: {
              generic_name: { type: "string" },
              brand_names: { type: "string" },
              drug_class: { type: "string" },
              disease_areas: { type: "array", items: { type: "string" } },
              mechanism_of_action: { type: "string" },
              administration_route: { type: "string" },
              study_name: { type: "string" },
              dosing: { type: "string" },
              side_effects_common: { type: "array", items: { type: "string" } },
              side_effects_serious: { type: "array", items: { type: "string" } },
              contraindications: { type: "array", items: { type: "string" } },
              monitoring: { type: "string" },
            },
            required: ["generic_name", "drug_class"],
            additionalProperties: false,
          },
        },
        summary: { type: "string" },
        is_oncology_relevant: { type: "boolean" },
        relevance_reason: { type: "string" },
      },
      required: ["regimens", "summary", "is_oncology_relevant"],
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

    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "Geen tekst ontvangen" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Je bent een expert in oncologische farmacologie. Analyseer wetenschappelijke artikeltekst en extraheer medicijnregimens.

Beoordeel eerst of de tekst oncologie-relevant is. Als dat niet zo is, retourneer een lege regimens-array en is_oncology_relevant=false.
Als de tekst wel relevant is, extraheer generieke naam, merknamen, klasse, werkingsmechanisme, ziektegebieden, toedieningsweg, dosering, studienaam, bijwerkingen, contra-indicaties en monitoring.
Gebruik alleen gestructureerde tool output.`;

    const extracted = await callAIToolJson({
      operation: "analyze_pdf_drug",
      apiKey,
      model: "google/gemini-2.5-flash",
      timeoutMs: 45_000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyseer deze tekst uit een wetenschappelijk artikel:\n\n${String(text).slice(0, 20000)}` },
      ],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "function", function: { name: "extract_drug_regimens" } },
      schema: ExtractionSchema,
    });

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-pdf-drug error:", error instanceof Error ? error.name : "UnknownError");
    if (error instanceof AIClientError) {
      return new Response(JSON.stringify({ error: error.userMessage }), {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
