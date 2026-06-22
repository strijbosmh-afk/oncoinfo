import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AIClientError, callAIJson, z } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JsonObjectSchema = z.record(z.unknown());

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { content, target_language } = await req.json();
    if (!content || !target_language || target_language === "nl") {
      return new Response(JSON.stringify({ translated: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const langNames: Record<string, string> = {
      fr: "French",
      de: "German",
      en: "English",
    };
    const langName = langNames[target_language] || "English";

    const systemPrompt = `You are a professional medical translator specializing in oncology. Translate every string value in the provided JSON into ${langName}.

Rules:
1. Translate every string value recursively, including array items and nested object values.
2. Keep JSON keys exactly unchanged.
3. Keep drug names, chemical formulas, numeric dosages, units and standard medical abbreviations unchanged.
4. Output only raw JSON. No markdown fences, explanation or commentary.`;

    const translated = await callAIJson({
      operation: "translate_drug_content",
      apiKey,
      model: "google/gemini-2.5-flash",
      timeoutMs: 30_000,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Translate every string value in this JSON to ${langName}.\n\nJSON:\n${JSON.stringify(content)}` },
      ],
      schema: JsonObjectSchema,
    });

    return new Response(JSON.stringify({ translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("translate-drug-content error:", error instanceof Error ? error.name : "UnknownError");
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
