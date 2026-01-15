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
    const { pubmedId } = await req.json();
    
    if (!pubmedId) {
      return new Response(
        JSON.stringify({ error: "PubMed ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from PubMed E-utilities API
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pubmedId}&retmode=xml`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from PubMed");
    }

    const xml = await response.text();
    
    // Parse XML to extract key fields
    const title = xml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1] || "";
    const abstract = xml.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/)?.[1] || "";
    const journal = xml.match(/<Title>([^<]+)<\/Title>/)?.[1] || "";
    const year = xml.match(/<PubDate>.*?<Year>(\d{4})<\/Year>/s)?.[1] || "";
    const doi = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1] || "";
    
    // Extract authors
    const authorMatches = xml.matchAll(/<Author[^>]*>.*?<LastName>([^<]+)<\/LastName>.*?<ForeName>([^<]+)<\/ForeName>.*?<\/Author>/gs);
    const authors = Array.from(authorMatches).map(m => `${m[2]} ${m[1]}`).slice(0, 10);

    return new Response(
      JSON.stringify({
        title,
        abstract,
        journal,
        year: year ? parseInt(year) : null,
        doi,
        authors,
        pubmedId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});