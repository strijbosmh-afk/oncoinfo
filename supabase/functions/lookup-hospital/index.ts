import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HospitalEntry {
  official_name: string;
  domain: string;
  brand_color: string;
  aliases: string[];
}

// Generate multiple logo URL candidates for a domain
function logoUrls(domain: string): string[] {
  return [
    `https://icon.horse/icon/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://logo.clearbit.com/${domain}`,
  ];
}

// Try each URL with a HEAD request, return first that responds 200 with image content-type
async function findWorkingLogo(domain: string): Promise<string> {
  const candidates = logoUrls(domain);
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      const ct = resp.headers.get("content-type") || "";
      if (resp.ok && (ct.startsWith("image/") || url.includes("google.com/s2/favicons"))) {
        return url;
      }
    } catch {
      // skip
    }
  }
  // Default fallback
  return `https://icon.horse/icon/${domain}`;
}

const KNOWN_HOSPITALS: HospitalEntry[] = [
  { official_name: "UZ Leuven", domain: "uzleuven.be", brand_color: "#003D6B", aliases: ["uzleuven", "uz leuven", "universitair ziekenhuis leuven"] },
  { official_name: "UZ Gent", domain: "uzgent.be", brand_color: "#0063AF", aliases: ["uzgent", "uz gent", "universitair ziekenhuis gent"] },
  { official_name: "Institut Jules Bordet", domain: "bordet.be", brand_color: "#1B3C6E", aliases: ["bordet", "jules bordet", "institut bordet", "institut jules bordet"] },
  { official_name: "Jessa Ziekenhuis", domain: "jessazh.be", brand_color: "#E30613", aliases: ["jessa", "jessa ziekenhuis", "jessa ziekenhuizen", "jessazh"] },
  { official_name: "AZ Maria Middelares", domain: "azmariamiddelares.be", brand_color: "#003F72", aliases: ["maria middelares", "az maria middelares", "az maria middelares gent"] },
  { official_name: "AZ Groeninge", domain: "azgroeninge.be", brand_color: "#006633", aliases: ["groeninge", "az groeninge", "az groeninge kortrijk"] },
  { official_name: "AZ Klina", domain: "klina.be", brand_color: "#009CDE", aliases: ["klina", "az klina", "az klina brasschaat"] },
  { official_name: "UZ Brussel", domain: "uzbrussel.be", brand_color: "#E4002B", aliases: ["uzbrussel", "uz brussel", "universitair ziekenhuis brussel"] },
  { official_name: "AZ Sint-Lucas Gent", domain: "azstlucas.be", brand_color: "#1D70B8", aliases: ["sint-lucas", "az sint-lucas", "az sint-lucas gent", "az st lucas"] },
  { official_name: "AZ Sint-Jan Brugge", domain: "azsintjan.be", brand_color: "#003DA5", aliases: ["sint-jan", "az sint-jan", "az sint-jan brugge"] },
  { official_name: "AZ Delta", domain: "azdelta.be", brand_color: "#E30613", aliases: ["az delta", "azdelta", "az delta roeselare"] },
  { official_name: "AZ Nikolaas", domain: "aznikolaas.be", brand_color: "#009640", aliases: ["nikolaas", "az nikolaas", "az nikolaas sint-niklaas"] },
  { official_name: "AZ Turnhout", domain: "azturnhout.be", brand_color: "#0066B3", aliases: ["az turnhout", "azturnhout"] },
  { official_name: "AZ Monica", domain: "azmonica.be", brand_color: "#E30613", aliases: ["monica", "az monica", "az monica antwerpen", "az monica deurne"] },
  { official_name: "AZ Vesalius", domain: "azvesalius.be", brand_color: "#005DAA", aliases: ["vesalius", "az vesalius", "az vesalius tongeren"] },
  { official_name: "Ziekenhuis Oost-Limburg", domain: "zol.be", brand_color: "#00A651", aliases: ["zol", "ziekenhuis oost-limburg", "ziekenhuis oost limburg"] },
  { official_name: "CHU de Liège", domain: "chuliege.be", brand_color: "#003F87", aliases: ["chu liege", "chu de liège", "chu liège", "chuliege"] },
  { official_name: "Cliniques Universitaires Saint-Luc", domain: "saintluc.be", brand_color: "#0054A6", aliases: ["saint-luc", "cliniques saint-luc", "saint luc", "saintluc"] },
  { official_name: "AZ Jan Palfijn Gent", domain: "azjanpalfijn.be", brand_color: "#E30613", aliases: ["jan palfijn", "az jan palfijn", "az jan palfijn gent"] },
  { official_name: "GZA Ziekenhuizen", domain: "gza.be", brand_color: "#00599D", aliases: ["gza", "gza ziekenhuizen", "gasthuiszusters antwerpen"] },
  { official_name: "AZ Alma", domain: "azalma.be", brand_color: "#8DC63F", aliases: ["alma", "az alma", "az alma eeklo"] },
  { official_name: "AZ Glorieux", domain: "azglorieux.be", brand_color: "#003DA5", aliases: ["glorieux", "az glorieux", "az glorieux ronse"] },
  { official_name: "AZ Damiaan", domain: "azdamiaan.be", brand_color: "#009FE3", aliases: ["damiaan", "az damiaan", "az damiaan oostende"] },
  { official_name: "AZ Sint-Blasius", domain: "azsintblasius.be", brand_color: "#E30613", aliases: ["sint-blasius", "az sint-blasius", "az sint-blasius dendermonde"] },
  { official_name: "AZ Sint-Maarten", domain: "azstmaarten.be", brand_color: "#003DA5", aliases: ["sint-maarten", "az sint-maarten", "az sint-maarten mechelen"] },
  { official_name: "Imelda Ziekenhuis", domain: "imelda.be", brand_color: "#005BAC", aliases: ["imelda", "imelda ziekenhuis", "imelda bonheiden"] },
  { official_name: "AZ Herentals", domain: "azherentals.be", brand_color: "#009640", aliases: ["az herentals", "azherentals"] },
  { official_name: "AZ Rivierenland", domain: "azrivierenland.be", brand_color: "#0079C1", aliases: ["rivierenland", "az rivierenland", "az rivierenland bornem"] },
  { official_name: "AZ Sint-Dimpna", domain: "azsintdimpna.be", brand_color: "#0072CE", aliases: ["sint-dimpna", "az sint-dimpna", "az sint-dimpna geel"] },
  { official_name: "OLV Ziekenhuis Aalst", domain: "olvz.be", brand_color: "#003DA5", aliases: ["olv", "olvz", "olv aalst", "olv ziekenhuis aalst", "onze-lieve-vrouw aalst"] },
  { official_name: "Regionaal Ziekenhuis Tienen", domain: "rztienen.be", brand_color: "#6B2D5B", aliases: ["rz tienen", "rztienen", "regionaal ziekenhuis tienen"] },
  { official_name: "Vitaz", domain: "vitaz.be", brand_color: "#E30613", aliases: ["vitaz", "vitaz sint-niklaas"] },
  { official_name: "AZ Zeno", domain: "azzeno.be", brand_color: "#009FE3", aliases: ["zeno", "az zeno", "az zeno knokke"] },
  { official_name: "AZ Oudenaarde", domain: "azoudenaarde.be", brand_color: "#003DA5", aliases: ["az oudenaarde", "azoudenaarde"] },
  { official_name: "CHR de la Citadelle", domain: "chrcitadelle.be", brand_color: "#003F87", aliases: ["citadelle", "chr citadelle", "chr de la citadelle"] },
  { official_name: "Grand Hôpital de Charleroi", domain: "ghdc.be", brand_color: "#0072CE", aliases: ["ghdc", "grand hopital de charleroi", "grand hôpital de charleroi"] },
  { official_name: "CHU UCL Namur", domain: "chuuclnamur.uclouvain.be", brand_color: "#0054A6", aliases: ["chu ucl namur", "chu namur", "chuuclnamur"] },
  { official_name: "Clinique Saint-Pierre Ottignies", domain: "cspo.be", brand_color: "#003DA5", aliases: ["cspo", "saint-pierre ottignies", "clinique saint-pierre"] },
  { official_name: "Hôpital Erasme", domain: "erasme.ulb.ac.be", brand_color: "#003F87", aliases: ["erasme", "hopital erasme", "hôpital erasme"] },
  { official_name: "AZ Sint-Elisabeth Zottegem", domain: "azstelisabeth.be", brand_color: "#003DA5", aliases: ["sint-elisabeth", "az sint-elisabeth", "az sint-elisabeth zottegem"] },
  { official_name: "Mariaziekenhuis Noord-Limburg", domain: "mznl.be", brand_color: "#E30613", aliases: ["mznl", "mariaziekenhuis", "mariaziekenhuis noord-limburg"] },
  { official_name: "AZ Diest", domain: "azdiest.be", brand_color: "#009640", aliases: ["az diest", "azdiest"] },
  { official_name: "Heilig Hartziekenhuis Lier", domain: "hhzhlier.be", brand_color: "#E30613", aliases: ["heilig hart lier", "hhzh lier", "heilig hartziekenhuis lier"] },
  { official_name: "Jan Yperman Ziekenhuis", domain: "yperman.net", brand_color: "#003DA5", aliases: ["yperman", "jan yperman", "jan yperman ziekenhuis", "jan yperman ieper"] },
  { official_name: "AZ West", domain: "azwest.be", brand_color: "#0079C1", aliases: ["az west", "azwest", "az west veurne"] },
  { official_name: "Chirec", domain: "chirec.be", brand_color: "#E30613", aliases: ["chirec", "chirec delta", "chirec braine"] },
  { official_name: "Centre Hospitalier de Mouscron", domain: "chmouscron.be", brand_color: "#003F87", aliases: ["ch mouscron", "centre hospitalier mouscron"] },
  { official_name: "Hôpitaux Iris Sud", domain: "his-izz.be", brand_color: "#0072CE", aliases: ["iris sud", "his", "hopitaux iris sud", "hôpitaux iris sud"] },
  { official_name: "AZ Lokeren", domain: "azlokeren.be", brand_color: "#003DA5", aliases: ["az lokeren", "azlokeren"] },
  { official_name: "Sint-Andriesziekenhuis Tielt", domain: "satielt.be", brand_color: "#009640", aliases: ["sint-andries", "sint-andriesziekenhuis", "sa tielt"] },
];

function findKnownHospital(query: string): HospitalEntry | null {
  const q = query.toLowerCase().trim();
  // Exact alias match
  for (const h of KNOWN_HOSPITALS) {
    if (h.aliases.some(a => a === q)) return h;
  }
  // Partial match
  for (const h of KNOWN_HOSPITALS) {
    if (h.aliases.some(a => q.includes(a) || a.includes(q))) return h;
  }
  // Domain match
  for (const h of KNOWN_HOSPITALS) {
    if (q.includes(h.domain.split('.')[0])) return h;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.length > 200) {
      return new Response(JSON.stringify({ error: "query is required (max 200 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check predefined list first
    const known = findKnownHospital(query);
    if (known) {
      console.log("Found in predefined list:", known.official_name);
      const logo_url = await findWorkingLogo(known.domain);
      console.log("Best logo URL:", logo_url);
      return new Response(JSON.stringify({
        official_name: known.official_name,
        domain: known.domain,
        logo_url,
        brand_color: known.brand_color,
        country: "BE",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to AI lookup
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");

    const response = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert at identifying Belgian and Dutch hospitals.
Given a partial or abbreviated hospital name, return the official full name, the hospital's primary website domain, and a direct URL to their logo image.

Rules:
- Focus on Belgian hospitals first, then Dutch ones.
- Common abbreviations: RZ = Regionaal Ziekenhuis, AZ = Algemeen Ziekenhuis, UZ = Universitair Ziekenhuis, ZOL = Ziekenhuis Oost-Limburg, OLV = Onze-Lieve-Vrouw, etc.
- For the logo URL, try to find the actual logo from the hospital website. Common patterns:
  - https://www.{domain}/logo.svg or .png
  - https://logo.clearbit.com/{domain}
  - Or any known direct logo URL
- For the brand color, identify the primary brand color from the hospital's visual identity (hex format).
- Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `Identify this hospital: "${query}"

Return JSON: {"official_name": "...", "domain": "...", "logo_url": "...", "brand_color": "#...", "country": "XX"}
Where country is ISO 3166-1 alpha-2 code (e.g. BE, NL, FR, DE).`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "hospital_info",
                description:
                  "Return structured hospital identification results",
                parameters: {
                  type: "object",
                  properties: {
                    official_name: {
                      type: "string",
                      description: "The official full name of the hospital",
                    },
                    domain: {
                      type: "string",
                      description:
                        "The primary website domain (e.g. rztienen.be)",
                    },
                    logo_url: {
                      type: "string",
                      description:
                        "Direct URL to the hospital logo image, or clearbit fallback",
                    },
                    brand_color: {
                      type: "string",
                      description:
                        "Primary brand color in hex format (e.g. #6b2d5b)",
                    },
                    country: {
                      type: "string",
                      description:
                        "ISO 3166-1 alpha-2 country code (e.g. BE, NL, FR, DE)",
                    },
                  },
                  required: [
                    "official_name",
                    "domain",
                    "logo_url",
                    "brand_color",
                    "country",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "hospital_info" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt, probeer later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Geen credits meer, voeg credits toe." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Find best working logo URL
    if (result.domain) {
      result.logo_url = await findWorkingLogo(result.domain);
    } else if (!result.logo_url) {
      result.logo_url = "";
    }

    console.log("Hospital lookup result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lookup-hospital error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
