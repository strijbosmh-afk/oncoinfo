import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TOOL_DEF = {
  type: 'function' as const,
  function: {
    name: 'save_drug_schema',
    description: 'Save a drug/regimen schema to the database',
    parameters: {
      type: 'object',
      properties: {
        drug_id: { type: 'string', description: 'Existing drug ID if editing, empty if new' },
        schema_name: { type: 'string', description: 'Display name for the schema chosen by the user (e.g. "EC-Paclitaxel dd", "FOLFOX", "Pembrolizumab mono")' },
        generic_name: { type: 'string', description: 'Generic/INN name or combination name' },
        brand_names: { type: 'array', items: { type: 'string' }, description: 'Brand names, Belgian market preferred' },
        drug_class: { type: 'string', description: 'Drug class from the predefined list' },
        mechanism_of_action: { type: 'string', description: 'Mechanism of action in Dutch' },
        disease_areas: { type: 'array', items: { type: 'string' }, description: 'Disease areas from predefined list' },
        administration_route: { type: 'string', description: 'Route: Oraal, Intraveneus, Subcutaan, Intramusculair, Intravesicaal' },
        standard_dose: { type: 'string', description: 'Standard dosage string' },
        dosing_frequency: { type: 'string', description: 'Frequency e.g. q3w, dagelijks' },
        cycle_length_days: { type: 'number', description: 'Cycle length in days' },
        is_on_zvz: { type: 'boolean', description: 'On RIZIV/ZVZ reimbursement list' },
        registration_trial: { type: 'string', description: 'Pivotal registration trial name' },
        approved_indications: { type: 'array', items: { type: 'string' }, description: 'Approved indications with specifics (e.g. HR+/HER2- mBC)' },
        components_description: { type: 'string', description: 'For combinations: description of components with doses' },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phase_name: { type: 'string', description: 'Name of this phase (e.g. "Fase 1: EC dose-dense", "Fase 2: Paclitaxel wekelijks")' },
              drugs: { type: 'string', description: 'Drugs in this phase with doses' },
              schedule: { type: 'string', description: 'Schedule description (e.g. "q2w x 4 cycli", "wekelijks x 12")' },
              duration: { type: 'string', description: 'Duration of this phase' },
            },
          },
          description: 'For multi-phase regimens: array of sequential phases. Empty array for single-phase.',
        },
      },
      required: ['generic_name', 'drug_class', 'disease_areas', 'schema_name'],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    if (action === 'save') {
      return await handleSave(messages, authClient, user.id, corsHeaders, LOVABLE_API_KEY);
    }

    if (action === 'extract') {
      return await handleExtract(messages, corsHeaders, LOVABLE_API_KEY);
    }

    if (action === 'load' && drug_id) {
      return await handleLoad(drug_id, authClient, corsHeaders);
    }

    // Stream chat
    const systemPrompt = buildSystemPrompt();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
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

function buildSystemPrompt(): string {
  return `Je bent een gespecialiseerde oncologisch farmaceutische assistent voor het OncoInfo platform. Je helpt gebruikers stap voor stap bij het aanmaken of bewerken van behandelschema's (drugs/regimens).

## KRITISCH BELANGRIJK
- Je bent DIRECT verbonden met de OncoInfo database. Wanneer de gebruiker "Opslaan" of "Bewaren" typt, wordt het schema DAADWERKELIJK opgeslagen in de database via een geautomatiseerd proces.
- Zeg NOOIT dat je niet kunt opslaan, dat je simuleert, of dat je geen toegang hebt tot de database. Dat is ONWAAR.
- Je KUNT en MOET schema's opslaan wanneer de gebruiker dat vraagt.
- Schema's worden opgeslagen onder het ziekenhuis van de ingelogde gebruiker. Andere ziekenhuizen zien dit schema NIET.

## Jouw rol
- Begeleid de gebruiker stapsgewijs door het proces
- Stel gerichte vragen, één onderwerp per keer
- Valideer antwoorden en stel correcties voor waar nodig
- Werk in het Nederlands

## Stappen voor een NIEUW schema
1. Vraag eerst: Gaat het om een individueel middel of een combinatieschema?
2. Vraag de naam/namen van het middel/de middelen
3. Vraag het ziektegebied (bijv. Prostaatkanker, Borstkanker, NSCLC, etc.)
4. **INDICATIE-LOGICA**: Vraag de SPECIFIEKE indicatie op basis van het ziektegebied (zie hieronder)
5. Vraag de medicijnklasse (IO/ICI, PARPi, Chemotherapie, TKI, ADC, Combinatietherapie, etc.)
6. Vraag dosering en toedieningsweg
7. **MEERDERE FASEN**: Vraag of het schema uit meerdere opeenvolgende fasen bestaat (zie hieronder)
8. Vraag cyclusduur (per fase indien meerdere fasen)
9. Vraag of het middel op de ZVZ-lijst staat (RIZIV-terugbetaling)
10. Vraag naar de registratiestudie (pivotale Phase III trial)
11. Vraag naar merknamen (focus op Belgische markt)
12. **SCHEMA NAAM**: Vraag onder welke naam het schema opgeslagen moet worden (bijv. "EC-Paclitaxel dd", "FOLFOX-4", "Pembrolizumab mono"). Stel een logische naam voor op basis van de verzamelde info.
13. Geef een samenvatting en vraag bevestiging

## MEERDERE FASEN (SEQUENTIËLE BEHANDELING)
Veel oncologische schema's bestaan uit meerdere opeenvolgende fasen. Voorbeelden:
- **EC dose-dense → Paclitaxel wekelijks**: Fase 1 = EC q2w x4, Fase 2 = Paclitaxel wekelijks x12
- **AC → Docetaxel**: Fase 1 = AC q3w x4, Fase 2 = Docetaxel q3w x4
- **FOLFOX inductie → capecitabine onderhoud**: Fase 1 = FOLFOX q2w x12, Fase 2 = Capecitabine
- **Inductie → consolidatie → onderhoud**

Vraag bij elk schema:
1. "Bestaat dit schema uit meerdere opeenvolgende fasen/blokken?"
2. Indien ja, vraag per fase:
   - Naam van de fase (bijv. "Inductie", "Fase 1: EC", "Consolidatie")
   - Welke middelen in deze fase
   - Dosering per middel
   - Schema/interval (bijv. q2w, q3w, wekelijks)
   - Aantal cycli of duur van deze fase
3. Maak duidelijk dat de fasen SEQUENTIEEL zijn (na elkaar, niet tegelijk)

## INDICATIE-LOGICA per ziektegebied
Na het ziektegebied, stel de juiste vervolgvragen:

### Borstkanker
- Hormoonreceptorstatus: HR+ of HR-?
- HER2-status: HER2+, HER2-low, HER2-zero?
- BRCA-status: BRCA-mutatie of wild-type?
- Setting: (neo)adjuvant, lokaal gevorderd, gemetastaseerd?
- Lijn: 1e lijn, 2e lijn, 3e lijn+?

### Prostaatkanker
- Stadium: mHSPC, mCRPC, nmCRPC?
- Setting: Lokaal gevorderd of gemetastaseerd?
- Eerdere behandelingen: Post-docetaxel? Post-ARTA?
- BRCA/HRR-status indien relevant?

### NSCLC
- Histologie: Plaveiselcel of niet-plaveiselcel (adenocarcinoom)?
- PD-L1 expressie: ≥50%, 1-49%, <1%?
- Driver mutaties: EGFR, ALK, ROS1, KRAS G12C, BRAF V600E, MET, RET, NTRK?
- Setting: Lokaal gevorderd (stadium III) of gemetastaseerd (stadium IV)?
- Lijn: 1e lijn, 2e lijn+?

### Niercelcarcinoom
- Histologie: Heldercellig of niet-heldercellig?
- IMDC-risicoscore: Gunstig, intermediair, ongunstig?
- Setting: Adjuvant of gemetastaseerd?
- Lijn: 1e lijn, 2e lijn+?

### Blaaskanker
- Type: Urotheelcelcarcinoom of niet-urotheelcel?
- Setting: Neoadjuvant, adjuvant, lokaal gevorderd, gemetastaseerd?
- Cisplatine-geschikt: Ja of nee?
- PD-L1 status indien relevant?

### Colorectaal carcinoom
- Zijdigheid: Links of rechts?
- RAS/BRAF-status: RAS-wild-type, RAS-mutant, BRAF V600E?
- MSI-status: MSI-H/dMMR of MSS/pMMR?
- Setting: Adjuvant of gemetastaseerd?
- Lijn: 1e lijn, 2e lijn, 3e lijn+?

### Ovariumcarcinoom
- Histologie: Sereus, endometrioid, helder-cellig, mucineus?
- BRCA-status: BRCA1/2-mutatie of wild-type? HRD-status?
- Setting: 1e lijn, platinum-sensitief recidief, platinum-resistent?

### Melanoom
- Type: Cutaan, mucosaal, uveaal?
- BRAF-status: BRAF V600E/K mutatie of wild-type?
- Stadium: Stadium III (adjuvant) of stadium IV?
- Lijn: 1e lijn, 2e lijn+?

### Hepatocellulair carcinoom
- Child-Pugh score: A of B?
- Setting: 1e lijn of 2e lijn?
- Eerdere behandeling: Post-sorafenib/lenvatinib?

### Maag-/oesofaguscarcinoom
- Histologie: Adenocarcinoom of plaveiselcel?
- HER2-status: HER2+ of HER2-?
- PD-L1 CPS score?
- MSI-status?
- Setting: Peri-operatief of gemetastaseerd?

### Endometriumcarcinoom
- Histologie: Endometrioid of sereus/helder-cellig?
- MMR/MSI-status: dMMR of pMMR?
- HER2-status indien sereus?
- Setting: Adjuvant of gemetastaseerd?

### Cervixcarcinoom
- PD-L1 CPS score?
- Setting: Persistent, recidief, of gemetastaseerd?
- Lijn: 1e lijn, 2e lijn+?

### Hoofd-halscarcinoom
- Sublocatie: Orofarynx, larynx, hypofarynx, mondholte?
- HPV/p16-status?
- PD-L1 CPS score?
- Setting: Lokaal gevorderd of gemetastaseerd?

### Voor ALLE overige ziektegebieden
Vraag minimaal:
- Specifieke subtypes of histologie
- Relevante biomarkers
- Setting (adjuvant/gevorderd/gemetastaseerd)
- Behandellijn

## Stappen voor BEWERKEN
- Toon de huidige waarden
- Vraag wat de gebruiker wil wijzigen
- Begeleid de wijziging stap voor stap
- Geef een samenvatting van de wijzigingen

## Combinatieschema's (binnen één fase)
Bij combinaties, vraag per bestanddeel:
- Naam van het middel
- Dosering
- Toedieningsweg (IV, PO, SC)
- Interval (bijv. dag 1, dag 1+8)
- Cyclusduur

## Wanneer alle informatie compleet is
Geef een overzichtelijke samenvatting in een tabel-achtig formaat. Vermeld duidelijk:
- De gekozen SCHEMA NAAM
- Bij meerdere fasen: toon elke fase apart met middelen, doses, schema en duur
- Vraag de gebruiker om te bevestigen met "Opslaan" of "Bewaren"
- Vermeld dat er een popup verschijnt met een definitief overzicht ter bevestiging

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
- Als de gebruiker informatie geeft die medisch incorrect lijkt, vraag dan bevestiging
- De indicatie moet SPECIFIEK zijn (bijv. "HR+/HER2- gemetastaseerd borstcarcinoom, 1e lijn" in plaats van alleen "Borstkanker")
- Schema's zijn ziekenhuis-specifiek: elk ziekenhuis beheert zijn eigen schema's onafhankelijk`;
}

function buildExtractionPrompt(): string {
  return `Analyseer het volledige gesprek en extraheer de definitieve gegevens van het behandelschema dat de gebruiker wil opslaan. Gebruik tool calling om de gestructureerde data te retourneren.

Belangrijk:
- Gebruik de LAATSTE waarden die de gebruiker heeft bevestigd
- Als het een combinatietherapie is, zet drug_class op "Combinatietherapie"
- Genereer de standard_dose string door de componenten samen te voegen met " + "
- Als er een bestaand drug_id wordt genoemd voor bewerking, neem dat mee
- De approved_indications moeten SPECIFIEK zijn (bijv. "HR+/HER2- gemetastaseerd borstcarcinoom, 1e lijn")
- Neem ALLE biomarker-informatie en setting-informatie mee in approved_indications
- schema_name is VERPLICHT: gebruik de naam die de gebruiker heeft gekozen
- Als het schema uit meerdere fasen bestaat, vul het phases array in met alle details per fase
- Als het schema uit één fase bestaat, laat phases leeg`;
}

async function callAIExtraction(messages: any[], apiKey: string) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: buildExtractionPrompt() },
        ...messages,
      ],
      tools: [TOOL_DEF],
      tool_choice: { type: 'function', function: { name: 'save_drug_schema' } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('AI extraction error:', response.status, text);
    throw new Error('Kon schema niet extraheren uit gesprek');
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    throw new Error('Kon geen gestructureerde data extraheren');
  }

  return JSON.parse(toolCall.function.arguments);
}

async function handleExtract(
  messages: any[],
  corsHeaders: Record<string, string>,
  apiKey: string,
) {
  try {
    const extracted = await callAIExtraction(messages, apiKey);
    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

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
  let drugData: any;
  try {
    drugData = await callAIExtraction(messages, apiKey);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get the user's hospital_id for scoping
  const { data: profile } = await authClient
    .from('profiles')
    .select('hospital_id')
    .eq('user_id', userId)
    .single();

  const hospitalId = profile?.hospital_id || null;

  const dosingInfo: any = {};
  if (drugData.standard_dose) dosingInfo.standard_dose = drugData.standard_dose;
  if (drugData.dosing_frequency) dosingInfo.frequency = drugData.dosing_frequency;
  if (drugData.components_description) dosingInfo.components = drugData.components_description;
  if (drugData.phases && drugData.phases.length > 0) dosingInfo.phases = drugData.phases;

  const dbRecord: any = {
    generic_name: drugData.schema_name || drugData.generic_name,
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
    hospital_id: hospitalId,
  };

  let result;
  if (drugData.drug_id) {
    // Don't overwrite hospital_id on update
    delete dbRecord.hospital_id;
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
