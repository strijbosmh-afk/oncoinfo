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
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Geen tekst ontvangen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Je bent een expert in oncologische farmacologie. Je analyseert wetenschappelijke artikelen en extraheert ALLE medicijnregimens die worden beschreven.

STAP 1 - RELEVANTIE CHECK:
Beoordeel eerst of de tekst gerelateerd is aan oncologie (kankerbehandeling, tumortherapie, chemotherapie, immunotherapie, targeted therapy, etc.).
Als de tekst NIET over oncologie gaat, geef dan een lege regimens-array terug en zet is_oncology_relevant op false met een duidelijke uitleg waarom.

STAP 2 - EXTRACTIE (alleen als oncologie-relevant):
Voor elk medicijn of combinatieschema dat je vindt:
1. Identificeer de generieke naam/namen
2. Geef de merknamen als je die kent
3. Classificeer het type therapie
4. Beschrijf het werkingsmechanisme
5. Geef de belangrijkste bijwerkingen (veel voorkomend EN ernstig) - gebruik je medische kennis om deze aan te vullen
6. Geef contra-indicaties
7. Geef de toedieningsweg en dosering als beschikbaar
8. Noem de studienaam als die in de tekst staat
9. Geef de relevante ziektegebieden

BELANGRIJK: Vul bijwerkingen, contra-indicaties en veiligheidsinformatie aan met je eigen medische kennis. De PDF bevat mogelijk niet alle veiligheidsinformatie - jij moet die aanvullen op basis van bekende farmacologische data.

Voor drug_class, kies uit: Immunotherapie (IO/ICI), PARPi, ARPI, Chemotherapie, TKI, ADC, Radioligand Therapie, Hormonale Therapie, Antiresorptiva, Combinatietherapie, Supportive Care, HER2-remmers, CDK4/6i, Angiogeneseremmers, PI3K-remmers, mTOR-remmers

Voor disease_areas, kies uit: Prostaatkanker, Blaaskanker, Niercelcarcinoom, Testiskanker, Peniskanker, Borstkanker, Ovariumcarcinoom, Endometriumcarcinoom, Cervixcarcinoom, Vulvacarcinoom

Voor administration_route, kies uit: Oraal, Intraveneus, Subcutaan, Intramusculair`;

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
          { role: "user", content: `Analyseer deze tekst uit een wetenschappelijk artikel. Extraheer ALLE medicijnregimens en vul de veiligheidsinformatie aan met je kennis:\n\n${text.slice(0, 20000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_drug_regimens",
              description: "Beoordeel oncologische relevantie en extraheer alle medicijnregimens met volledige veiligheidsinformatie",
              parameters: {
                type: "object",
                properties: {
                  regimens: {
                    type: "array",
                    description: "Lijst van geëxtraheerde medicijnregimens",
                    items: {
                      type: "object",
                      properties: {
                        generic_name: { type: "string", description: "Generieke naam van het medicijn of combinatie" },
                        brand_names: { type: "string", description: "Merknamen, kommagescheiden" },
                        drug_class: { type: "string", description: "Medicijnklasse" },
                        disease_areas: {
                          type: "array",
                          items: { type: "string" },
                          description: "Ziektegebieden",
                        },
                        mechanism_of_action: { type: "string", description: "Werkingsmechanisme in 1-2 zinnen" },
                        administration_route: { type: "string", description: "Toedieningsweg" },
                        study_name: { type: "string", description: "Studienaam (bijv. KEYNOTE-426)" },
                        dosing: { type: "string", description: "Dosering en schema" },
                        side_effects_common: {
                          type: "array",
                          items: { type: "string" },
                          description: "Veel voorkomende bijwerkingen (top 5-8)",
                        },
                        side_effects_serious: {
                          type: "array",
                          items: { type: "string" },
                          description: "Ernstige/levensbedreigende bijwerkingen (top 3-5)",
                        },
                        contraindications: {
                          type: "array",
                          items: { type: "string" },
                          description: "Belangrijkste contra-indicaties",
                        },
                        monitoring: { type: "string", description: "Belangrijkste monitoringvereisten" },
                      },
                      required: ["generic_name", "drug_class"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Korte samenvatting van het artikel (2-3 zinnen)" },
                  is_oncology_relevant: { type: "boolean", description: "Of het artikel gaat over oncologie/kankerbehandeling" },
                  relevance_reason: { type: "string", description: "Uitleg waarom het artikel wel of niet oncologie-relevant is (1 zin)" },
                },
                required: ["regimens", "summary", "is_oncology_relevant"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_drug_regimens" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Krediet op, voeg tegoed toe aan je workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analyse mislukt");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Geen gestructureerde data ontvangen van AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(extracted),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
