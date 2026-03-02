import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.oncoinfo.be",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// In-memory rate limiter: max 60 requests per minute per API key
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  return {
    allowed: bucket.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - bucket.count),
    resetAt: bucket.resetAt,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // API Key authentication
  const apiKey = req.headers.get("x-api-key");
  const validApiKey = Deno.env.get("ONCOINFO_API_KEY");
  if (!apiKey || apiKey !== validApiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized. Provide a valid X-API-Key header." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const rl = checkRateLimit(apiKey);
  const rlHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
  };
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  // Use service role to bypass RLS for the public API
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/public-api/, "");

  try {
    // GET /drugs — list all platform drugs (non-archived, no hospital_id)
    if (req.method === "GET" && (path === "/drugs" || path === "/drugs/")) {
      const q = url.searchParams.get("q");           // search query
      const disease_area = url.searchParams.get("disease_area");
      const drug_class = url.searchParams.get("drug_class");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = db
        .from("drugs")
        .select(
          "id, generic_name, brand_names, drug_class, disease_areas, mechanism_of_action, " +
          "administration_route, approved_indications, common_regimens, dosing_info, " +
          "side_effects, contraindications, monitoring_requirements, " +
          "ema_approval_date, fda_approval_date, is_on_zvz, registration_trial, " +
          "cycle_length_days, updated_at"
        )
        .eq("is_archived", false)
        .is("hospital_id", null) // only platform (shared) drugs
        .range(offset, offset + limit - 1)
        .order("generic_name");

      if (q) {
        query = query.or(`generic_name.ilike.%${q}%,drug_class.ilike.%${q}%`);
      }
      if (disease_area) {
        query = query.contains("disease_areas", [disease_area]);
      }
      if (drug_class) {
        query = query.ilike("drug_class", `%${drug_class}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ total: count, offset, limit, drugs: data }),
        { headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /drugs/:id — single drug details
    const drugMatch = path.match(/^\/drugs\/([^/]+)$/);
    if (req.method === "GET" && drugMatch && !path.endsWith("/leaflet")) {
      const drugId = drugMatch[1];
      const { data, error } = await db
        .from("drugs")
        .select("*")
        .eq("id", drugId)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Drug not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ drug: data }), {
        headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /drugs/:id/leaflet — patient leaflet content
    const leafletMatch = path.match(/^\/drugs\/([^/]+)\/leaflet$/);
    if (req.method === "GET" && leafletMatch) {
      const drugId = leafletMatch[1];

      const [drugRes, leafletRes] = await Promise.all([
        db.from("drugs").select("id, generic_name, brand_names, drug_class").eq("id", drugId).single(),
        db.from("patient_folder_content").select("*").eq("drug_id", drugId).is("hospital_id", null).maybeSingle(),
      ]);

      if (drugRes.error || !drugRes.data) {
        return new Response(JSON.stringify({ error: "Drug not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ drug: drugRes.data, leaflet: leafletRes.data ?? null }),
        { headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /search?q=... — unified search across drugs
    if (req.method === "GET" && path === "/search") {
      const q = url.searchParams.get("q") || "";
      if (!q) {
        return new Response(JSON.stringify({ error: "Missing query parameter 'q'" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await db
        .from("drugs")
        .select("id, generic_name, brand_names, drug_class, disease_areas, approved_indications")
        .eq("is_archived", false)
        .is("hospital_id", null)
        .or(`generic_name.ilike.%${q}%,drug_class.ilike.%${q}%`)
        .order("generic_name")
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({ query: q, results: data }),
        { headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET / — API info / help
    if (req.method === "GET" && (path === "" || path === "/")) {
      return new Response(
        JSON.stringify({
          name: "OncoInfo REST API",
          version: "1.0.0",
          description: "Oncology drug database API for AI assistants and integrations",
          endpoints: [
            { method: "GET", path: "/public-api/drugs", description: "List all platform drugs. Query params: q, disease_area, drug_class, limit, offset" },
            { method: "GET", path: "/public-api/drugs/:id", description: "Get full details of a single drug by UUID" },
            { method: "GET", path: "/public-api/drugs/:id/leaflet", description: "Get patient leaflet content for a drug" },
            { method: "GET", path: "/public-api/search?q=...", description: "Search drugs by name or class" },
          ],
          authentication: "Pass your API key in the X-API-Key header",
          rate_limit: `${RATE_LIMIT} requests per minute`,
        }),
        { headers: { ...corsHeaders, ...rlHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("public-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
