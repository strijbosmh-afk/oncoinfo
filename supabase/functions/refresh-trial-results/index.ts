import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISEASE_AREA_TERMS: Record<string, string[]> = {
  'Prostate Cancer': ['prostate', 'prostatic', 'psa', 'crpc', 'mcrpc', 'hspc', 'mhspc', 'nmcrpc'],
  'Bladder Cancer': ['bladder', 'urothelial', 'uroepithelial', 'transitional cell carcinoma'],
  'Renal Cell Carcinoma': ['renal', 'kidney', 'rcc', 'clear cell', 'nephrectomy'],
  'Testicular Cancer': ['testicular', 'testis', 'germ cell', 'seminoma', 'non-seminoma'],
  'Penile Cancer': ['penile', 'penis', 'squamous cell carcinoma of the penis']
};

function getStudyText(study: any): string {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const description = protocol.descriptionModule || {};
  const conditions = protocol.conditionsModule?.conditions || [];
  const keywords = protocol.conditionsModule?.keywords || [];
  
  return [
    identification.officialTitle || '',
    identification.briefTitle || '',
    description.briefSummary || '',
    ...conditions,
    ...keywords
  ].join(' ').toLowerCase();
}

function matchesDiseaseArea(study: any, diseaseArea: string): boolean {
  const studyText = getStudyText(study);
  const terms = DISEASE_AREA_TERMS[diseaseArea] || [];
  return terms.some(term => studyText.includes(term.toLowerCase()));
}

function isOncologyStudy(study: any): boolean {
  const studyText = getStudyText(study);
  const oncologyTerms = [
    'cancer', 'carcinoma', 'tumor', 'tumour', 'oncology', 'malignant', 
    'neoplasm', 'metastatic', 'chemotherapy', 'immunotherapy'
  ];
  return oncologyTerms.some(term => studyText.includes(term));
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
  
  return Math.min(70, (commonWords.length / Math.max(words1.length, words2.length)) * 100);
}

async function searchCTGov(acronym: string, title: string, diseaseArea: string): Promise<{ nctId: string; score: number } | null> {
  const MIN_CONFIDENCE_SCORE = 40;
  
  // Search by acronym first
  const searchTerms = [acronym];
  
  for (const term of searchTerms) {
    try {
      const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(term)}&pageSize=10`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const studies = data.studies || [];
      
      for (const study of studies) {
        const nctId = study.protocolSection?.identificationModule?.nctId;
        if (!nctId) continue;
        
        // Check if it matches the disease area and is oncology-related
        if (!isOncologyStudy(study)) continue;
        if (!matchesDiseaseArea(study, diseaseArea)) continue;
        
        // Check acronym match
        const studyAcronym = study.protocolSection?.identificationModule?.acronym || '';
        const studyTitle = study.protocolSection?.identificationModule?.officialTitle || 
                          study.protocolSection?.identificationModule?.briefTitle || '';
        
        let score = 0;
        
        // Acronym match is most important
        if (studyAcronym.toLowerCase() === acronym.toLowerCase()) {
          score += 60;
        } else if (studyAcronym.toLowerCase().includes(acronym.toLowerCase()) || 
                   acronym.toLowerCase().includes(studyAcronym.toLowerCase())) {
          score += 40;
        }
        
        // Title similarity
        const titleSimilarity = calculateSimilarity(title, studyTitle);
        score += titleSimilarity * 0.4;
        
        if (score >= MIN_CONFIDENCE_SCORE) {
          return { nctId, score };
        }
      }
    } catch (error) {
      console.error(`Search error for ${term}:`, error);
    }
  }
  
  return null;
}

async function fetchCTGovResults(nctId: string): Promise<any | null> {
  try {
    const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}?fields=protocolSection`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const protocol = data.protocolSection;
    
    if (!protocol) return null;
    
    const resultsSection = data.resultsSection;
    const status = protocol.statusModule;
    
    return {
      nct_id: nctId,
      source: 'ClinicalTrials.gov',
      has_ctgov_results: !!resultsSection,
      enrollment: protocol.designModule?.enrollmentInfo?.count,
      status: status?.overallStatus,
      primary_completion_date: status?.primaryCompletionDateStruct?.date,
      study_completion_date: status?.completionDateStruct?.date,
    };
  } catch (error) {
    console.error(`Error fetching CTGov results for ${nctId}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trial_id, refresh_all = false, only_missing = true } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query based on parameters
    let query = supabase.from("trials").select("id, acronym, title, disease_area, results_summary");
    
    if (trial_id) {
      query = query.eq("id", trial_id);
    } else if (only_missing) {
      query = query.is("results_summary", null);
    }
    
    if (refresh_all) {
      // No additional filter - get all trials
    }

    const { data: trials, error: fetchError } = await query.limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch trials: ${fetchError.message}`);
    }

    if (!trials || trials.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trials to update", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { acronym: string; status: string; nctId?: string; score?: number }[] = [];
    let updatedCount = 0;

    for (const trial of trials) {
      try {
        // Search for matching CTGov study
        const match = await searchCTGov(trial.acronym, trial.title, trial.disease_area);
        
        if (!match) {
          results.push({ acronym: trial.acronym, status: "no_match_found" });
          continue;
        }

        // Fetch results from CTGov
        const ctgovResults = await fetchCTGovResults(match.nctId);
        
        if (!ctgovResults) {
          results.push({ acronym: trial.acronym, status: "fetch_failed", nctId: match.nctId });
          continue;
        }

        // Update trial with results
        const { error: updateError } = await supabase
          .from("trials")
          .update({ 
            results_summary: {
              ...ctgovResults,
              match_score: match.score,
              updated_at: new Date().toISOString()
            }
          })
          .eq("id", trial.id);

        if (updateError) {
          results.push({ acronym: trial.acronym, status: "update_failed", nctId: match.nctId });
          console.error(`Update error for ${trial.acronym}:`, updateError);
        } else {
          results.push({ 
            acronym: trial.acronym, 
            status: "updated", 
            nctId: match.nctId,
            score: match.score 
          });
          updatedCount++;
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error processing ${trial.acronym}:`, error);
        results.push({ acronym: trial.acronym, status: "error" });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${trials.length} trials, updated ${updatedCount}`,
        updated: updatedCount,
        total: trials.length,
        results
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
