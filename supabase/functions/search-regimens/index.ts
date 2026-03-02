import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.oncoinfo.be",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PubMedSearchResult {
  pmid: string;
  title: string;
  abstract: string;
  journal: string;
  year: number | null;
  authors: string[];
  doi: string;
}

async function searchPubMed(query: string, maxResults = 20): Promise<PubMedSearchResult[]> {
  // Search PubMed
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) throw new Error("PubMed search failed");
  const searchData = await searchResp.json();
  const ids: string[] = searchData?.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  // Fetch summaries
  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`;
  const fetchResp = await fetch(fetchUrl);
  if (!fetchResp.ok) throw new Error("PubMed fetch failed");
  const xml = await fetchResp.text();

  // Parse articles from XML
  const articles: PubMedSearchResult[] = [];
  const articleBlocks = xml.split(/<PubmedArticle>/g).slice(1);

  for (const block of articleBlocks) {
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || "";
    const title = block.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1] || "";
    const journal = block.match(/<Title>([^<]+)<\/Title>/)?.[1] || "";
    const yearMatch = block.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    const doi = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1] || "";

    // Abstract
    const abstractMatches = block.matchAll(/<AbstractText[^>]*(?:Label="([^"]*)")?[^>]*>([^<]*)<\/AbstractText>/g);
    const abstractParts: string[] = [];
    for (const m of abstractMatches) {
      const label = m[1];
      const text = m[2]?.trim();
      if (text) abstractParts.push(label ? `${label}: ${text}` : text);
    }

    // Authors
    const authorMatches = block.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?<ForeName>([^<]*)<\/ForeName>[\s\S]*?<\/Author>/g);
    const authors = Array.from(authorMatches).map(m => `${m[2]} ${m[1]}`).slice(0, 5);

    articles.push({
      pmid,
      title,
      abstract: abstractParts.join("\n\n"),
      journal,
      year,
      authors,
      doi,
    });
  }

  return articles;
}

async function searchClinicalTrials(query: string, maxResults = 10): Promise<any[]> {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=${maxResults}&format=json&fields=NCTId,BriefTitle,Phase,OverallStatus,Condition,InterventionName,StartDate,CompletionDate,EnrollmentCount`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data?.studies || []).map((s: any) => ({
    nctId: s.protocolSection?.identificationModule?.nctId || "",
    title: s.protocolSection?.identificationModule?.briefTitle || "",
    phase: (s.protocolSection?.designModule?.phases || []).join(", "),
    status: s.protocolSection?.statusModule?.overallStatus || "",
    conditions: s.protocolSection?.conditionsModule?.conditions || [],
    interventions: (s.protocolSection?.armsInterventionsModule?.interventions || []).map((i: any) => i.name),
    enrollment: s.protocolSection?.designModule?.enrollmentInfo?.count || null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    // Check admin
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { discipline, drug_type, source = "pubmed" } = await req.json();
    if (!discipline) {
      return new Response(JSON.stringify({ error: "Discipline is verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search query
    let searchQuery = `${discipline} cancer treatment regimen`;
    if (drug_type) searchQuery += ` ${drug_type}`;
    searchQuery += " clinical trial";

    let results: any = {};
    if (source === "pubmed" || source === "both") {
      results.pubmed = await searchPubMed(searchQuery);
    }
    if (source === "ctgov" || source === "both") {
      results.ctgov = await searchClinicalTrials(searchQuery);
    }
    // Default to pubmed if no valid source
    if (!results.pubmed && !results.ctgov) {
      results.pubmed = await searchPubMed(searchQuery);
    }

    return new Response(JSON.stringify({ success: true, query: searchQuery, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Search error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
