import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const systemPrompt = `Je bent een expert in oncologische farmacologie. Analyseer de gegeven tekst (uit een wetenschappelijk artikel of PDF) en extraheer gestructureerde informatie over het medicijn of de therapie.

Gebruik tool calling om de geëxtraheerde informatie te retourneren. Vul alleen velden in waarvan je zeker bent op basis van de tekst. Laat velden leeg als de informatie niet beschikbaar is.

Voor drug_class, kies uit: Immunotherapie (IO/ICI), PARPi, ARPI, Chemotherapie, TKI, ADC, Radioligand Therapie, Hormonale Therapie, Antiresorptiva, Combinatietherapie, Supportive Care, HER2-remmers, CDK4/6i

Voor disease_areas, kies uit: Prostaatkanker, Blaaskanker, Niercelcarcinoom, Testiskanker, Peniskanker

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
          { role: "user", content: `Analyseer deze tekst en extraheer medicijninformatie:\n\n${text.slice(0, 15000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_drug_info",
              description: "Extraheer medicijninformatie uit de tekst",
              parameters: {
                type: "object",
                properties: {
                  generic_name: { type: "string", description: "Generieke naam van het medicijn" },
                  brand_names: { type: "string", description: "Merknamen, kommagescheiden" },
                  drug_class: { type: "string", description: "Medicijnklasse" },
                  disease_areas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Ziektegebieden",
                  },
                  mechanism_of_action: { type: "string", description: "Werkingsmechanisme" },
                  administration_route: { type: "string", description: "Toedieningsweg" },
                  study_name: { type: "string", description: "Studienaam (bijv. KEYNOTE-426)" },
                },
                required: ["generic_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_drug_info" } },
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
      JSON.stringify({ extracted }),
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
