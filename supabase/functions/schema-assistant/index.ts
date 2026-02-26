import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, action, drug_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If action is "save", extract structured data and save to DB
    if (action === 'save') {
      return await handleSave(messages, authClient, user.id, corsHeaders, LOVABLE_API_KEY);
    }

    // If action is "load", fetch existing drug data for editing
    if (action === 'load' && drug_id) {
      return await handleLoad(drug_id, authClient, corsHeaders);
    }

    // Otherwise, stream the chat
    const systemPrompt = `Je bent een gespecialiseerde oncologisch farmaceutische assistent voor het OncoInfo platform. Je helpt gebruikers stap voor stap bij het aanmaken of bewerken van behandelschema's (drugs/regimens).

## Jouw rol
- Begeleid de gebruiker stapsgewijs door het proces
- Stel gerichte vragen, één onderwerp per keer
- Valideer antwoorden en stel correcties voor waar nodig
- Werk in het Nederlands

## Stappen voor een NIEUW schema
1. Vraag eerst: Gaat het om een individueel middel of een combinatieschema?
2. Vraag de naam/namen van het middel/de middelen
3. Vraag het ziektegebied (bijv. Prostaatkanker, Borstkanker, NSCLC, etc.)
4. Vraag de medicijnklasse (IO/ICI, PARPi, Chemotherapie, TKI, ADC, Combinatietherapie, etc.)
5. Vraag dosering en toedieningsweg
6. Vraag cyclusduur
7. Vraag of het middel op de ZVZ-lijst staat (RIZIV-terugbetaling)
8. Vraag naar de registratiestudie (pivotale Phase III trial)
9. Vraag naar merknamen (focus op Belgische markt)
10. Geef een samenvatting en vraag bevestiging

## Stappen voor BEWERKEN
- Toon de huidige waarden
- Vraag wat de gebruiker wil wijzigen
- Begeleid de wijziging stap voor stap
- Geef een samenvatting van de wijzigingen

## Combinatieschema's
Bij combinaties, vraag per bestanddeel:
- Naam van het middel
- Dosering
- Toedieningsweg (IV, PO, SC)
- Interval (bijv. dag 1, dag 1+8)
- Cyclusduur

## Wanneer alle informatie compleet is
Geef een overzichtelijke samenvatting in een tabel-achtig formaat en vraag de gebruiker om te bevestigen met "Opslaan" of "Bewaren". Vermeld duidelijk dat de gebruiker "Opslaan" kan typen om het schema op te slaan.

## Beschikbare ziektegebieden
Borstkanker, Prostaatkanker, Blaaskanker, Niercelcarcinoom, Testiskanker, Peniskanker, Ovariumcarcinoom, Endometriumcarcinoom, Cervixcarcinoom, Vulvacarcinoom, NSCLC, SCLC, Mesothelioom, Colorectaal carcinoom, Maagcarcinoom, Oesofaguscarcinoom, Pancreascarcinoom, Hepatocellulair carcinoom, Galwegcarcinoom, Melanoom, Merkelcelcarcinoom, Cutaan plaveiselcelcarcinoom, Hoofd-halscarcinoom, Nasofarynxcarcinoom, Speekselkliercarcinoom, Supportive Care

## Beschikbare medicijnklassen
Immunotherapie (IO/ICI), PARPi, ARTA, Chemotherapie, TKI, ADC, Radioligand Therapie, Hormonale Therapie, Antiresorptiva, Combinatietherapie, Supportive Care, HER2-remmers, CDK4/6i, ALK-remmer, EGFR-remmer, Angiogeneseremmer, BRAF/MEK-remmer, KRAS-remmer, FGFR-remmer

## Beschikbare toedieningswegen
Oraal, Intraveneus, Subcutaan, Intramusculair, Intravesicaal

## Belangrijk
- Als de gebruiker een bestaand schema wil bewerken, vraag dan welk medicijn ze willen aanpassen
- Antwoord ALTIJD in het Nederlands
- Wees beknopt maar volledig
- Gebruik je oncologische kennis om suggesties te doen bij onvolledige informatie
- Als de gebruiker informatie geeft die medisch incorrect lijkt, vraag dan bevestiging`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt, probeer later opnieuw.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits op, voeg credits toe.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('schema-assistant error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleLoad(drugId: string, authClient: any, corsHeaders: Record<string, string>) {
  const { data, error } = await authClient
    .from('drugs')
    .select('*')
    .eq('id', drugId)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Medicijn niet gevonden' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, drug: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleSave(
  messages: any[],
  authClient: any,
  userId: string,
  corsHeaders: Record<string, string>,
  apiKey: string,
) {
  // Use AI to extract structured drug data from conversation
  const extractionPrompt = `Analyseer het volledige gesprek en extraheer de definitieve gegevens van het behandelschema dat de gebruiker wil opslaan. Gebruik tool calling om de gestructureerde data te retourneren.

Belangrijk:
- Gebruik de LAATSTE waarden die de gebruiker heeft bevestigd
- Als het een combinatietherapie is, zet drug_class op "Combinatietherapie"
- Genereer de standard_dose string door de componenten samen te voegen met " + "
- Als er een bestaand drug_id wordt genoemd voor bewerking, neem dat mee`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: extractionPrompt },
        ...messages,
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'save_drug_schema',
          description: 'Save a drug/regimen schema to the database',
          parameters: {
            type: 'object',
            properties: {
              drug_id: { type: 'string', description: 'Existing drug ID if editing, empty if new' },
              generic_name: { type: 'string', description: 'Generic/INN name or combination name' },
              brand_names: {
                type: 'array',
                items: { type: 'string' },
                description: 'Brand names, Belgian market preferred',
              },
              drug_class: { type: 'string', description: 'Drug class from the predefined list' },
              mechanism_of_action: { type: 'string', description: 'Mechanism of action in Dutch' },
              disease_areas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Disease areas from predefined list',
              },
              administration_route: { type: 'string', description: 'Route: Oraal, Intraveneus, Subcutaan, Intramusculair, Intravesicaal' },
              standard_dose: { type: 'string', description: 'Standard dosage string' },
              dosing_frequency: { type: 'string', description: 'Frequency e.g. q3w, dagelijks' },
              cycle_length_days: { type: 'number', description: 'Cycle length in days' },
              is_on_zvz: { type: 'boolean', description: 'On RIZIV/ZVZ reimbursement list' },
              registration_trial: { type: 'string', description: 'Pivotal registration trial name' },
              approved_indications: {
                type: 'array',
                items: { type: 'string' },
                description: 'Approved indications',
              },
              components_description: { type: 'string', description: 'For combinations: description of components with doses' },
            },
            required: ['generic_name', 'drug_class', 'disease_areas'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'save_drug_schema' } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('AI extraction error:', response.status, text);
    return new Response(JSON.stringify({ error: 'Kon schema niet extraheren uit gesprek' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    return new Response(JSON.stringify({ error: 'Kon geen gestructureerde data extraheren' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const drugData = JSON.parse(toolCall.function.arguments);

  // Build the DB record
  const dosingInfo: any = {};
  if (drugData.standard_dose) dosingInfo.standard_dose = drugData.standard_dose;
  if (drugData.dosing_frequency) dosingInfo.frequency = drugData.dosing_frequency;
  if (drugData.components_description) dosingInfo.components = drugData.components_description;

  const dbRecord: any = {
    generic_name: drugData.generic_name,
    drug_class: drugData.drug_class,
    disease_areas: drugData.disease_areas || [],
    mechanism_of_action: drugData.mechanism_of_action || null,
    brand_names: drugData.brand_names || [],
    administration_route: drugData.administration_route || null,
    is_on_zvz: drugData.is_on_zvz || false,
    registration_trial: drugData.registration_trial || null,
    approved_indications: drugData.approved_indications || null,
    cycle_length_days: drugData.cycle_length_days || null,
    dosing_info: Object.keys(dosingInfo).length > 0 ? dosingInfo : null,
  };

  let result;
  if (drugData.drug_id) {
    // Update existing
    const { data: updated, error } = await authClient
      .from('drugs')
      .update(dbRecord)
      .eq('id', drugData.drug_id)
      .select()
      .single();
    if (error) {
      console.error('DB update error:', error);
      return new Response(JSON.stringify({ error: `Database fout: ${error.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    result = { success: true, action: 'updated', drug: updated };
  } else {
    // Insert new
    const { data: inserted, error } = await authClient
      .from('drugs')
      .insert(dbRecord)
      .select()
      .single();
    if (error) {
      console.error('DB insert error:', error);
      return new Response(JSON.stringify({ error: `Database fout: ${error.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    result = { success: true, action: 'created', drug: inserted };
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
