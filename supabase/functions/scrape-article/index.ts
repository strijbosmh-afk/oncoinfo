const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    // Check if it's a PubMed URL and extract PMID for API access
    const pubmedMatch = formattedUrl.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
    const pmcMatch = formattedUrl.match(/ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)/);

    let articleText = "";
    let title = "";
    let source = "web";

    if (pubmedMatch) {
      // Use PubMed API for better text extraction
      const pmid = pubmedMatch[1];
      source = "pubmed";
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
      const resp = await fetch(fetchUrl);
      if (!resp.ok) throw new Error("PubMed API fout");
      const xml = await resp.text();

      title = xml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1] || "";

      // Extract abstract
      const abstractMatches = xml.matchAll(/<AbstractText[^>]*(?:Label="([^"]*)")?[^>]*>([\s\S]*?)<\/AbstractText>/g);
      const abstractParts: string[] = [];
      for (const m of abstractMatches) {
        const label = m[1];
        const text = m[2]?.replace(/<[^>]+>/g, "").trim();
        if (text) abstractParts.push(label ? `${label}: ${text}` : text);
      }
      articleText = `Title: ${title}\n\nAbstract:\n${abstractParts.join("\n\n")}`;

      // Try to get full text from PMC
      const pmcIdMatch = xml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/);
      if (pmcIdMatch) {
        try {
          const pmcResp = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcIdMatch[1]}&retmode=xml`);
          if (pmcResp.ok) {
            const pmcXml = await pmcResp.text();
            // Extract body text from PMC XML
            const bodyMatch = pmcXml.match(/<body>([\s\S]*?)<\/body>/);
            if (bodyMatch) {
              const bodyText = bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              if (bodyText.length > 200) {
                articleText += `\n\nFull Text:\n${bodyText.slice(0, 30000)}`;
                source = "pmc";
              }
            }
          }
        } catch {
          // PMC full text not available, continue with abstract
        }
      }
    } else if (pmcMatch) {
      // Direct PMC URL
      source = "pmc";
      const pmcId = pmcMatch[1];
      const pmcResp = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcId}&retmode=xml`);
      if (!pmcResp.ok) throw new Error("PMC API fout");
      const pmcXml = await pmcResp.text();

      title = pmcXml.match(/<article-title>([\s\S]*?)<\/article-title>/)?.[1]?.replace(/<[^>]+>/g, "") || "";

      const bodyMatch = pmcXml.match(/<body>([\s\S]*?)<\/body>/);
      if (bodyMatch) {
        articleText = bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        articleText = `Title: ${title}\n\n${articleText.slice(0, 30000)}`;
      }

      // Also get abstract
      const abstractMatch = pmcXml.match(/<abstract>([\s\S]*?)<\/abstract>/);
      if (abstractMatch) {
        const abstractText = abstractMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        articleText = `Title: ${title}\n\nAbstract: ${abstractText}\n\n${articleText}`;
      }
    } else {
      // Generic web page - fetch HTML and extract text
      source = "web";
      const resp = await fetch(formattedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OncoInfo/1.0; +https://oncoinfo.lovable.app)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      if (!resp.ok) throw new Error(`Pagina kon niet worden geladen (status ${resp.status})`);
      const html = await resp.text();

      // Extract title
      title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";

      // Remove scripts, styles, nav, header, footer
      let cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "");

      // Try to find main/article content
      const mainMatch = cleaned.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
      if (mainMatch) {
        cleaned = mainMatch[1];
      }

      // Strip remaining tags
      articleText = cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      articleText = `Title: ${title}\n\n${articleText.slice(0, 30000)}`;
    }

    if (!articleText || articleText.length < 50) {
      return new Response(
        JSON.stringify({ error: "Geen bruikbare tekst gevonden op deze URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${articleText.length} chars from ${source} source`);

    return new Response(
      JSON.stringify({ success: true, text: articleText, title, source, chars: articleText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Scrape error:", error);
    const msg = error instanceof Error ? error.message : "Onbekende fout";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
