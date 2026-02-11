import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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

Return JSON: {"official_name": "...", "domain": "...", "logo_url": "...", "brand_color": "#..."}`,
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
                  },
                  required: [
                    "official_name",
                    "domain",
                    "logo_url",
                    "brand_color",
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

    // Build clearbit fallback if no specific logo found
    if (!result.logo_url && result.domain) {
      result.logo_url = `https://logo.clearbit.com/${result.domain}`;
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
