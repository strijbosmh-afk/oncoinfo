import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PubMedData {
  title: string;
  abstract: string;
  journal: string;
  year: number | null;
  doi: string;
  authors: string[];
  meshTerms: string[];
  publicationType: string;
  keywords: string[];
}

async function fetchPubMedData(pubmedId: string): Promise<PubMedData | null> {
  try {
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pubmedId}&retmode=xml`
    );
    
    if (!response.ok) return null;
    
    const xml = await response.text();
    
    // Extract title
    const title = xml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1] || "";
    
    // Extract abstract - handle structured abstracts with labels
    const abstractMatches = xml.matchAll(/<AbstractText[^>]*(?:Label="([^"]*)")?[^>]*>([^<]*)<\/AbstractText>/g);
    const abstractParts: string[] = [];
    for (const match of abstractMatches) {
      const label = match[1];
      const text = match[2].trim();
      if (text) {
        abstractParts.push(label ? `${label}: ${text}` : text);
      }
    }
    const abstract = abstractParts.join('\n\n');
    
    // Extract journal
    const journal = xml.match(/<Title>([^<]+)<\/Title>/)?.[1] || "";
    
    // Extract year
    const yearMatch = xml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    
    // Extract DOI
    const doi = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1] || "";
    
    // Extract authors
    const authorMatches = xml.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?<ForeName>([^<]*)<\/ForeName>[\s\S]*?<\/Author>/g);
    const authors = Array.from(authorMatches).map(m => `${m[2]} ${m[1]}`).slice(0, 15);
    
    // Extract MeSH terms
    const meshMatches = xml.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g);
    const meshTerms = Array.from(new Set(Array.from(meshMatches, m => m[1])));
    
    // Extract publication type
    const pubTypeMatch = xml.match(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/);
    const publicationType = pubTypeMatch?.[1] || "";
    
    // Extract keywords
    const keywordMatches = xml.matchAll(/<Keyword[^>]*>([^<]+)<\/Keyword>/g);
    const keywords = Array.from(new Set(Array.from(keywordMatches, m => m[1])));
    
    return {
      title,
      abstract,
      journal,
      year,
      doi,
      authors,
      meshTerms,
      publicationType,
      keywords
    };
  } catch (e) {
    console.error(`Error fetching PubMed ${pubmedId}:`, e);
    return null;
  }
}

// Parse numbers from abstract text
function parseNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    return isNaN(num) ? null : num;
  }
  return null;
}

// Extract structured data from abstract using regex patterns
function extractTrialDataFromAbstract(abstract: string, title: string): {
  sampleSize: number | null;
  hazardRatio: number | null;
  hrCiLower: number | null;
  hrCiUpper: number | null;
  pValue: number | null;
  medianOS: number | null;
  medianPFS: number | null;
  phase: string | null;
  designType: string | null;
  randomization: string | null;
  primaryEndpoint: string | null;
  keyFindings: string[];
} {
  const combinedText = `${title} ${abstract}`.toLowerCase();
  
  // Sample size patterns
  const sampleSize = parseNumber(combinedText, /(?:enrolled|randomized|included|recruited)\s*(?:a total of\s*)?(\d+)\s*(?:patients|subjects|participants)/i)
    || parseNumber(combinedText, /(?:n\s*=\s*|n=)(\d+)/i)
    || parseNumber(combinedText, /(\d+)\s*(?:patients|subjects|participants)\s*(?:were|who)\s*(?:enrolled|randomized)/i);
  
  // Hazard ratio patterns - more comprehensive
  const hrPatterns = [
    /hazard ratio[,:]?\s*(\d+\.?\d*)\s*[;,]?\s*(?:95%?\s*)?(?:ci|confidence interval)[:\s]*(\d+\.?\d*)\s*[-–to]\s*(\d+\.?\d*)/i,
    /hr[,:\s]+(\d+\.?\d*)\s*[;,]?\s*(?:95%?\s*)?(?:ci)?[:\s]*\(?(\d+\.?\d*)\s*[-–to]\s*(\d+\.?\d*)\)?/i,
    /(?:hr|hazard ratio)[:\s=]+(\d+\.?\d*)/i
  ];
  
  let hazardRatio: number | null = null;
  let hrCiLower: number | null = null;
  let hrCiUpper: number | null = null;
  
  for (const pattern of hrPatterns) {
    const match = combinedText.match(pattern);
    if (match) {
      hazardRatio = parseFloat(match[1]);
      if (match[2] && match[3]) {
        hrCiLower = parseFloat(match[2]);
        hrCiUpper = parseFloat(match[3]);
      }
      break;
    }
  }
  
  // P-value patterns
  const pValuePatterns = [
    /p\s*[<=>]\s*0?\.?(\d+)/i,
    /p\s*value[:\s]*[<=>]?\s*0?\.?(\d+)/i
  ];
  
  let pValue: number | null = null;
  for (const pattern of pValuePatterns) {
    const match = combinedText.match(pattern);
    if (match) {
      const pStr = match[1];
      pValue = pStr.startsWith('0') ? parseFloat(`0.${pStr}`) : parseFloat(`0.${pStr}`);
      break;
    }
  }
  
  // Median OS patterns
  const osPatterns = [
    /(?:median\s*)?(?:overall\s*survival|os)[:\s]*(?:was\s*)?(\d+\.?\d*)\s*(?:months?|mo)/i,
    /(?:mos|median os)[:\s]*(\d+\.?\d*)\s*(?:months?|mo)?/i
  ];
  const medianOS = parseNumber(combinedText, osPatterns[0]) || parseNumber(combinedText, osPatterns[1]);
  
  // Median PFS patterns
  const pfsPatterns = [
    /(?:median\s*)?(?:progression[- ]free survival|pfs|rpfs)[:\s]*(?:was\s*)?(\d+\.?\d*)\s*(?:months?|mo)/i,
    /(?:mpfs|median pfs)[:\s]*(\d+\.?\d*)/i
  ];
  const medianPFS = parseNumber(combinedText, pfsPatterns[0]) || parseNumber(combinedText, pfsPatterns[1]);
  
  // Phase detection
  let phase: string | null = null;
  if (/phase\s*3|phase\s*iii/i.test(combinedText)) phase = "Phase III";
  else if (/phase\s*2|phase\s*ii/i.test(combinedText)) phase = "Phase II";
  else if (/phase\s*1|phase\s*i/i.test(combinedText)) phase = "Phase I";
  
  // Design type detection
  let designType: string | null = null;
  const designParts: string[] = [];
  if (/randomized|randomised/i.test(combinedText)) designParts.push("Randomized");
  if (/double[- ]blind/i.test(combinedText)) designParts.push("Double-blind");
  else if (/single[- ]blind/i.test(combinedText)) designParts.push("Single-blind");
  else if (/open[- ]label/i.test(combinedText)) designParts.push("Open-label");
  if (/placebo[- ]controlled/i.test(combinedText)) designParts.push("Placebo-controlled");
  if (/multicent(?:er|re)/i.test(combinedText)) designParts.push("Multicenter");
  if (designParts.length > 0) designType = designParts.join(", ");
  
  // Randomization ratio
  let randomization: string | null = null;
  const ratioMatch = combinedText.match(/(?:randomized|randomised)\s*(?:in\s*a\s*)?(\d+)[:\s]*(\d+)/i);
  if (ratioMatch) randomization = `${ratioMatch[1]}:${ratioMatch[2]}`;
  
  // Primary endpoint detection
  let primaryEndpoint: string | null = null;
  const endpointMatch = combinedText.match(/primary\s*(?:end[- ]?point|outcome)[:\s]*(?:was\s*)?([^.]+)/i);
  if (endpointMatch) {
    primaryEndpoint = endpointMatch[1].trim().substring(0, 100);
  }
  
  // Key findings - extract sentences with statistical results
  const keyFindings: string[] = [];
  const sentences = abstract.split(/\.\s+/);
  for (const sentence of sentences) {
    if (/(?:hr|hazard ratio|significantly|improved|reduced|benefit|superior)/i.test(sentence) &&
        /\d+\.?\d*/i.test(sentence)) {
      keyFindings.push(sentence.trim() + '.');
      if (keyFindings.length >= 3) break;
    }
  }
  
  return {
    sampleSize,
    hazardRatio,
    hrCiLower,
    hrCiUpper,
    pValue,
    medianOS,
    medianPFS,
    phase,
    designType,
    randomization,
    primaryEndpoint,
    keyFindings
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trial_id, batch_size = 10 } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get trials with pubmed_id that need data
    let query = supabase
      .from("trials")
      .select("id, acronym, title, pubmed_id, abstract, phase, design_type, sample_size, results_summary")
      .not("pubmed_id", "is", null);
    
    if (trial_id) {
      query = query.eq("id", trial_id);
    } else {
      // Get trials without abstract or with missing key data
      query = query.or("abstract.is.null,results_summary.is.null")
        .limit(batch_size);
    }
    
    const { data: trials, error: trialsError } = await query;
    
    if (trialsError) throw trialsError;
    if (!trials || trials.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trials to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const trial of trials) {
      console.log(`Processing: ${trial.acronym} (PubMed: ${trial.pubmed_id})`);
      
      // Fetch from PubMed
      const pubmedData = await fetchPubMedData(trial.pubmed_id);
      
      if (!pubmedData || !pubmedData.abstract) {
        console.log(`No PubMed data for ${trial.acronym}`);
        continue;
      }
      
      // Extract structured data from abstract
      const extractedData = extractTrialDataFromAbstract(pubmedData.abstract, pubmedData.title);
      
      // Build update object
      const updateData: any = {
        abstract: pubmedData.abstract,
        title: pubmedData.title || trial.title,
        journal: pubmedData.journal,
        publication_year: pubmedData.year,
        doi: pubmedData.doi,
        authors: pubmedData.authors,
        updated_at: new Date().toISOString()
      };
      
      // Add extracted design data if not already set
      if (!trial.phase && extractedData.phase) updateData.phase = extractedData.phase;
      if (!trial.design_type && extractedData.designType) updateData.design_type = extractedData.designType;
      if (!trial.sample_size && extractedData.sampleSize) updateData.sample_size = extractedData.sampleSize;
      if (extractedData.randomization) updateData.randomization = extractedData.randomization;
      if (extractedData.primaryEndpoint) updateData.primary_endpoint = extractedData.primaryEndpoint;
      
      // Build results summary
      const resultsSummary: any = {
        enrollment: extractedData.sampleSize,
        key_findings: extractedData.keyFindings,
        source: "PubMed abstract extraction"
      };
      
      if (extractedData.hazardRatio) {
        resultsSummary.hazard_ratio = {
          value: extractedData.hazardRatio,
          ci_lower: extractedData.hrCiLower,
          ci_upper: extractedData.hrCiUpper
        };
      }
      if (extractedData.pValue) resultsSummary.p_value = extractedData.pValue;
      if (extractedData.medianOS) resultsSummary.median_os_months = extractedData.medianOS;
      if (extractedData.medianPFS) resultsSummary.median_pfs_months = extractedData.medianPFS;
      
      updateData.results_summary = resultsSummary;
      
      // Update trial
      const { error: updateError } = await supabase
        .from("trials")
        .update(updateData)
        .eq("id", trial.id);
      
      if (updateError) {
        console.error(`Error updating ${trial.acronym}:`, updateError);
        continue;
      }
      
      // Create endpoint records if we have HR data
      if (extractedData.hazardRatio) {
        // Check if endpoints already exist
        const { data: existingEndpoints } = await supabase
          .from("endpoints")
          .select("id")
          .eq("trial_id", trial.id);
        
        if (!existingEndpoints || existingEndpoints.length === 0) {
          // Insert primary endpoint
          await supabase
            .from("endpoints")
            .insert({
              trial_id: trial.id,
              endpoint_name: extractedData.primaryEndpoint || "Primary Endpoint",
              endpoint_type: "primary",
              hazard_ratio: extractedData.hazardRatio,
              hazard_ratio_ci_lower: extractedData.hrCiLower,
              hazard_ratio_ci_upper: extractedData.hrCiUpper,
              p_value: extractedData.pValue,
              median_months: extractedData.medianOS || extractedData.medianPFS
            });
        }
      }
      
      results.push({
        trial_id: trial.id,
        acronym: trial.acronym,
        pubmed_id: trial.pubmed_id,
        abstract_length: pubmedData.abstract.length,
        has_hr: !!extractedData.hazardRatio,
        has_os: !!extractedData.medianOS,
        has_pfs: !!extractedData.medianPFS,
        phase: extractedData.phase,
        design: extractedData.designType
      });
      
      // Small delay to respect PubMed rate limits
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
