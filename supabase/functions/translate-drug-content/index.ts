import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { content, target_language } = await req.json();

    if (!content || !target_language || target_language === 'nl') {
      return new Response(JSON.stringify({ translated: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langNames: Record<string, string> = {
      fr: 'French (français)',
      de: 'German (Deutsch)',
      en: 'English',
    };
    const langName = langNames[target_language] || 'English';

    const systemPrompt = `You are a professional medical translator specializing in oncology. Your task: translate EVERY string value in the provided JSON from Dutch (or English) into ${langName}.

CRITICAL RULES — FOLLOW STRICTLY:
1. TRANSLATE EVERY SINGLE STRING VALUE. No Dutch or English words may remain in the output when the target is ${langName}. This includes short words, list items, single terms, headers, labels — EVERYTHING.
2. Translate recursively: walk into every nested object and every array element. Arrays of strings → translate each string. Nested objects → translate all string values inside.
3. Keep JSON keys EXACTLY as they are (do not translate keys).
4. Keep unchanged ONLY: drug brand/generic names (e.g. Pembrolizumab, Keytruda), chemical formulas, numeric dosages (e.g. "200 mg", "75 mg/m²"), units (mg, mL, kg), and standard medical abbreviations (IV, SC, IM, PO, q3w, ECOG, etc.). Everything else MUST be translated.
5. Common Dutch medical terms that MUST be translated (examples — apply same rule to ALL Dutch words):
   - "bijwerkingen" → side effects / effets secondaires / Nebenwirkungen
   - "misselijkheid" → nausea / nausées / Übelkeit
   - "vermoeidheid" → fatigue / fatigue / Müdigkeit
   - "huiduitslag" → rash / éruption cutanée / Hautausschlag
   - "diarree" → diarrhea / diarrhée / Durchfall
   - "koorts" → fever / fièvre / Fieber
   - "borstkanker" → breast cancer / cancer du sein / Brustkrebs
   - "longkanker" → lung cancer / cancer du poumon / Lungenkrebs
   - "dagelijks" → daily / quotidien / täglich
6. Use professional medical terminology appropriate for healthcare professionals in the target language.
7. Output ONLY the translated JSON object. No markdown fences, no explanations, no commentary. Just raw JSON matching the input structure exactly.`;

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
          { role: "user", content: `Translate every string value in this JSON to ${langName}. Leave NO Dutch words in the output (except drug names, units, and abbreviations as instructed).\n\nJSON:\n${JSON.stringify(content)}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", translated: content }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required", translated: content }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ translated: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (strip markdown code fences if present)
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const translated = JSON.parse(jsonStr);
      return new Response(JSON.stringify({ translated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response as JSON:", jsonStr.substring(0, 200));
      return new Response(JSON.stringify({ translated: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("translate-drug-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
