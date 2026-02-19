import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drug_name } = await req.json();
    if (!drug_name || typeof drug_name !== 'string' || drug_name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Drug name is required (min 2 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Je bent een oncologisch farmaceutisch expert met kennis van de Belgische markt. Gegeven een medicijnnaam, geef gestructureerde informatie terug over dit oncologisch geneesmiddel.

Antwoord ALTIJD in het Nederlands. Geef ALLEEN informatie waarvan je zeker bent. Als je iets niet weet, laat het veld leeg.
Geef bij merknamen de naam die in België wordt gebruikt/verkocht.
Geef bij dosering de standaarddosering voor de meest voorkomende oncologische indicatie.

Gebruik tool calling om je antwoord te structureren.`;

    const userPrompt = `Geef gedetailleerde oncologische informatie over het geneesmiddel: "${drug_name.trim()}"

Denk aan: generieke naam, merknamen (vooral Belgische markt), medicijnklasse, werkingsmechanisme, ziektegebieden, toedieningsweg, standaarddosering, frequentie van toediening, cyclusduur in dagen, en goedgekeurde indicaties.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'provide_drug_info',
            description: 'Provide structured oncology drug information',
            parameters: {
              type: 'object',
              properties: {
                generic_name: { type: 'string', description: 'Generic/INN name of the drug' },
                brand_names: { type: 'string', description: 'Comma-separated brand names, prioritize Belgian market names' },
                drug_class: { type: 'string', description: 'Drug class (e.g. IO/ICI, PARPi, Chemotherapie, TKI, etc.)' },
                mechanism_of_action: { type: 'string', description: 'Mechanism of action in Dutch' },
                disease_areas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Disease areas in Dutch (e.g. Prostaatkanker, Borstkanker, NSCLC)',
                },
                administration_route: { type: 'string', description: 'Route: IV, PO, SC, IM, or Intravesicaal' },
                standard_dose: { type: 'string', description: 'Standard dosage e.g. "200 mg" or "75 mg/m²"' },
                dosing_frequency: { type: 'string', description: 'Frequency e.g. "q3w", "dagelijks", "q2w"' },
                cycle_length_days: { type: 'number', description: 'Cycle length in days, e.g. 21 for q3w' },
                approved_indications: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'EMA-approved indications in Dutch',
                },
              },
              required: ['generic_name'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'provide_drug_info' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt, probeer later opnieuw.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits op, voeg credits toe aan je workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'Geen informatie gevonden voor dit medicijn.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const drugInfo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, drug: drugInfo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('enrich-drug-info error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
