import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CTGovStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
      acronym?: string;
    };
    statusModule: {
      overallStatus: string;
      completionDateStruct?: { date: string };
    };
    conditionsModule?: {
      conditions?: string[];
      keywords?: string[];
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    designModule?: {
      studyType: string;
      phases?: string[];
      designInfo?: {
        allocation?: string;
        interventionModel?: string;
        primaryPurpose?: string;
        maskingInfo?: {
          masking?: string;
        };
      };
      enrollmentInfo?: {
        count?: number;
        type?: string;
      };
    };
    armsInterventionsModule?: {
      armGroups?: Array<{
        label: string;
        type?: string;
        description?: string;
        interventionNames?: string[];
      }>;
      interventions?: Array<{
        type: string;
        name: string;
        description?: string;
      }>;
    };
    outcomesModule?: {
      primaryOutcomes?: Array<{
        measure: string;
        description?: string;
        timeFrame?: string;
      }>;
      secondaryOutcomes?: Array<{
        measure: string;
        description?: string;
        timeFrame?: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
    };
  };
  resultsSection?: {
    participantFlowModule?: {
      groups?: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
      periods?: Array<{
        title: string;
        milestones?: Array<{
          type: string;
          achievements?: Array<{
            groupId: string;
            numSubjects?: string;
            numUnits?: string;
          }>;
        }>;
      }>;
    };
    baselineCharacteristicsModule?: {
      groups?: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
      measures?: Array<{
        title: string;
        paramType?: string;
        unitOfMeasure?: string;
        classes?: Array<{
          categories?: Array<{
            measurements?: Array<{
              groupId: string;
              value?: string;
            }>;
          }>;
        }>;
      }>;
    };
    outcomeMeasuresModule?: {
      outcomeMeasures?: Array<{
        type: string;
        title: string;
        description?: string;
        timeFrame?: string;
        paramType?: string;
        unitOfMeasure?: string;
        groups?: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
        classes?: Array<{
          categories?: Array<{
            measurements?: Array<{
              groupId: string;
              value?: string;
              lowerLimit?: string;
              upperLimit?: string;
              spread?: string;
            }>;
          }>;
        }>;
        analyses?: Array<{
          groupIds?: string[];
          groupDescription?: string;
          paramType?: string;
          paramValue?: string;
          ciPctValue?: string;
          ciNumSides?: string;
          ciLowerLimit?: string;
          ciUpperLimit?: string;
          pValue?: string;
          statisticalMethod?: string;
        }>;
      }>;
    };
    adverseEventsModule?: {
      frequencyThreshold?: string;
      eventGroups?: Array<{
        id: string;
        title: string;
        description?: string;
        seriousNumAffected?: number;
        seriousNumAtRisk?: number;
        otherNumAffected?: number;
        otherNumAtRisk?: number;
      }>;
    };
  };
}

// Disease area mappings for matching
const DISEASE_AREA_TERMS: Record<string, string[]> = {
  "Prostate Cancer": [
    "prostate", "prostatic", "crpc", "mcrpc", "cspc", "mcspc", "hspc", "mhspc",
    "castration-resistant", "castration resistant", "hormone-sensitive", "hormone sensitive",
    "adt", "androgen deprivation", "enzalutamide", "abiraterone", "apalutamide", "darolutamide",
    "docetaxel", "cabazitaxel", "radium-223", "lutetium", "psma"
  ],
  "Bladder Cancer": [
    "bladder", "urothelial", "transitional cell", "uroepithelial", "urinary tract",
    "cystectomy", "intravesical", "bcg", "gemcitabine cisplatin", "mvac",
    "enfortumab", "erdafitinib", "pembrolizumab bladder", "atezolizumab bladder"
  ],
  "Kidney Cancer": [
    "kidney", "renal", "renal cell", "rcc", "clear cell", "papillary renal",
    "chromophobe", "nephrectomy", "cytoreductive",
    "sunitinib", "pazopanib", "axitinib", "cabozantinib", "lenvatinib", "everolimus", "temsirolimus",
    "nivolumab rcc", "ipilimumab rcc", "pembrolizumab rcc"
  ],
  "Testicular Cancer": [
    "testicular", "testis", "germ cell", "seminoma", "nonseminoma", "non-seminoma",
    "teratoma", "choriocarcinoma", "bep", "bleomycin etoposide", "orchiectomy",
    "rplnd", "retroperitoneal lymph node"
  ],
  "Penile Cancer": [
    "penile", "penis", "squamous cell penile"
  ]
};

// Get all text from a study for matching
function getStudyText(study: CTGovStudy): string {
  const protocol = study.protocolSection;
  const conditions = protocol.conditionsModule?.conditions || [];
  const keywords = protocol.conditionsModule?.keywords || [];
  const interventions = protocol.armsInterventionsModule?.interventions || [];
  
  return [
    protocol.identificationModule?.officialTitle || "",
    protocol.identificationModule?.briefTitle || "",
    protocol.descriptionModule?.briefSummary || "",
    ...conditions,
    ...keywords,
    ...interventions.map(i => `${i.name} ${i.description || ""}`)
  ].join(" ").toLowerCase();
}

// Check if a study is cancer/oncology related
function isOncologyStudy(study: CTGovStudy): boolean {
  const allText = getStudyText(study);
  
  const oncologyTerms = [
    "cancer", "carcinoma", "tumor", "tumour", "neoplasm", "malignant", "oncology",
    "metastatic", "metastasis", "chemotherapy", "immunotherapy", "checkpoint inhibitor",
    "bladder", "prostate", "kidney", "renal cell", "urothelial", "testicular", "germ cell",
    "penile", "adrenal", "urologic", "urological",
    "pembrolizumab", "nivolumab", "ipilimumab", "atezolizumab", "durvalumab", "avelumab",
    "docetaxel", "cabazitaxel", "paclitaxel", "cisplatin", "carboplatin", "gemcitabine",
    "enzalutamide", "abiraterone", "apalutamide", "darolutamide",
    "sunitinib", "pazopanib", "axitinib", "cabozantinib", "lenvatinib", "everolimus", "temsirolimus",
    "lutetium", "radium-223", "psma", "parp inhibitor", "olaparib", "rucaparib", "niraparib",
    "enfortumab", "sacituzumab", "erdafitinib",
    "radical prostatectomy", "radical cystectomy", "nephrectomy", "orchiectomy",
    "radiotherapy", "brachytherapy", "sbrt", "salvage"
  ];
  
  return oncologyTerms.some(term => allText.includes(term));
}

// Check if study matches the expected disease area
function matchesDiseaseArea(study: CTGovStudy, diseaseArea: string): boolean {
  const terms = DISEASE_AREA_TERMS[diseaseArea];
  if (!terms) return true; // No specific terms, allow any oncology study
  
  const studyText = getStudyText(study);
  
  // Must match at least one disease-specific term
  return terms.some(term => studyText.includes(term));
}

// Calculate similarity between two strings (simple word overlap)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let matchCount = 0;
  words1.forEach(word => {
    if (words2.has(word)) matchCount++;
  });
  
  return matchCount / Math.max(words1.size, words2.size);
}

// Calculate match confidence score
function calculateMatchScore(
  study: CTGovStudy, 
  trial: { acronym: string; title: string; disease_area: string; drugs?: string[] | null }
): { score: number; reasons: string[] } {
  const protocol = study.protocolSection;
  const studyText = getStudyText(study);
  const reasons: string[] = [];
  let score = 0;
  
  // 1. Exact acronym match (highest weight)
  const studyAcronym = protocol.identificationModule.acronym?.toLowerCase() || "";
  if (studyAcronym && studyAcronym === trial.acronym.toLowerCase()) {
    score += 50;
    reasons.push(`Exact acronym match: ${studyAcronym}`);
  } else if (studyAcronym && studyAcronym.includes(trial.acronym.toLowerCase())) {
    score += 25;
    reasons.push(`Partial acronym match: ${studyAcronym}`);
  }
  
  // 2. Disease area match (required for acceptance)
  if (matchesDiseaseArea(study, trial.disease_area)) {
    score += 30;
    reasons.push(`Disease area match: ${trial.disease_area}`);
  } else {
    // Major penalty if disease area doesn't match
    score -= 100;
    reasons.push(`Disease area MISMATCH: expected ${trial.disease_area}`);
  }
  
  // 3. Drug/intervention matching
  if (trial.drugs && trial.drugs.length > 0) {
    let drugMatches = 0;
    for (const drug of trial.drugs) {
      if (studyText.includes(drug.toLowerCase())) {
        drugMatches++;
      }
    }
    if (drugMatches > 0) {
      const drugScore = Math.min(20, drugMatches * 10);
      score += drugScore;
      reasons.push(`Drug matches: ${drugMatches}/${trial.drugs.length}`);
    }
  }
  
  // 4. Title similarity
  const briefTitle = protocol.identificationModule.briefTitle || "";
  const officialTitle = protocol.identificationModule.officialTitle || "";
  const titleSim1 = calculateSimilarity(trial.title, briefTitle);
  const titleSim2 = calculateSimilarity(trial.title, officialTitle);
  const titleSimilarity = Math.max(titleSim1, titleSim2);
  
  if (titleSimilarity > 0.3) {
    const titleScore = Math.round(titleSimilarity * 20);
    score += titleScore;
    reasons.push(`Title similarity: ${Math.round(titleSimilarity * 100)}%`);
  }
  
  // 5. Check if acronym appears in study title/text
  if (!studyAcronym && studyText.includes(trial.acronym.toLowerCase())) {
    score += 15;
    reasons.push(`Acronym found in study text`);
  }
  
  // 6. Phase 3 bonus (most landmark trials are phase 3)
  const phases = protocol.designModule?.phases || [];
  if (phases.some(p => p.includes("3"))) {
    score += 5;
    reasons.push("Phase 3 study");
  }
  
  // 7. Has results bonus (prefer studies with results)
  if (study.resultsSection) {
    score += 5;
    reasons.push("Has results data");
  }
  
  return { score, reasons };
}

// Enhanced search with validation
async function searchCTGov(
  searchTerm: string, 
  diseaseArea?: string,
  trial?: { acronym: string; title: string; disease_area: string; drugs?: string[] | null }
): Promise<{ studies: CTGovStudy[]; scoredStudies: Array<{ study: CTGovStudy; score: number; reasons: string[] }> }> {
  try {
    // Build search query - include disease area for better results
    const searchQuery = diseaseArea ? `${searchTerm} ${diseaseArea}` : searchTerm;
    const encodedTerm = encodeURIComponent(searchQuery);
    const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodedTerm}&pageSize=15&format=json`;
    
    console.log(`Searching ClinicalTrials.gov: ${searchQuery}`);
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) {
      console.error(`CTGov search failed: ${response.status}`);
      return { studies: [], scoredStudies: [] };
    }
    
    const data = await response.json();
    const studies = data.studies || [];
    
    // Filter to oncology studies
    const oncologyStudies = studies.filter((s: CTGovStudy) => isOncologyStudy(s));
    console.log(`Found ${studies.length} studies, ${oncologyStudies.length} are oncology-related`);
    
    // If we have trial info, score each study
    if (trial) {
      const scoredStudies = oncologyStudies.map((study: CTGovStudy) => {
        const { score, reasons } = calculateMatchScore(study, trial);
        return { study, score, reasons };
      }).sort((a: { score: number }, b: { score: number }) => b.score - a.score);
      
      // Log scoring for debugging
      for (const scored of scoredStudies.slice(0, 3)) {
        const nctId = scored.study.protocolSection.identificationModule.nctId;
        console.log(`  ${nctId}: score=${scored.score}, reasons: ${scored.reasons.join("; ")}`);
      }
      
      return { studies: oncologyStudies, scoredStudies };
    }
    
    return { studies: oncologyStudies, scoredStudies: [] };
  } catch (e) {
    console.error(`Error searching CTGov:`, e);
    return { studies: [], scoredStudies: [] };
  }
}

// Minimum confidence score to accept a match
const MIN_CONFIDENCE_SCORE = 40;

async function fetchCTGovStudy(nctId: string): Promise<CTGovStudy | null> {
  try {
    const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}?format=json`;
    
    console.log(`Fetching CTGov study: ${nctId}`);
    
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });
    
    if (!response.ok) {
      console.error(`CTGov fetch failed: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (e) {
    console.error(`Error fetching CTGov study:`, e);
    return null;
  }
}

function extractResultsData(study: CTGovStudy): {
  hasResults: boolean;
  nctId: string;
  sampleSize: number | null;
  arms: Array<{ name: string; description: string | null; sampleSize: number | null }>;
  primaryEndpoints: Array<{
    name: string;
    timeFrame: string | null;
    value: string | null;
    unit: string | null;
    hazardRatio: number | null;
    hrCiLower: number | null;
    hrCiUpper: number | null;
    pValue: number | null;
  }>;
  secondaryEndpoints: Array<{
    name: string;
    timeFrame: string | null;
    value: string | null;
    unit: string | null;
    hazardRatio: number | null;
    hrCiLower: number | null;
    hrCiUpper: number | null;
    pValue: number | null;
  }>;
  phase: string | null;
  designType: string | null;
  randomization: string | null;
  blinding: string | null;
  primaryOutcomeDescription: string | null;
  secondaryOutcomeNames: string[];
} {
  const hasResults = !!study.resultsSection;
  const protocol = study.protocolSection;
  const results = study.resultsSection;
  const nctId = protocol.identificationModule.nctId;
  
  // Sample size
  const sampleSize = protocol.designModule?.enrollmentInfo?.count || null;
  
  // Phase
  const phases = protocol.designModule?.phases || [];
  const phase = phases.length > 0 ? phases.join(", ").replace(/PHASE/g, "Phase").replace(/_/g, " ") : null;
  
  // Design
  const designInfo = protocol.designModule?.designInfo;
  const designParts: string[] = [];
  if (designInfo?.allocation) designParts.push(designInfo.allocation.replace(/_/g, " "));
  if (designInfo?.interventionModel) designParts.push(designInfo.interventionModel.replace(/_/g, " "));
  const designType = designParts.length > 0 ? designParts.join(", ") : null;
  
  // Randomization
  const randomization = designInfo?.allocation?.replace(/_/g, " ") || null;
  
  // Blinding
  const blinding = designInfo?.maskingInfo?.masking?.replace(/_/g, " ") || null;
  
  // Primary outcome from protocol
  const primaryOutcome = protocol.outcomesModule?.primaryOutcomes?.[0];
  const primaryOutcomeDescription = primaryOutcome?.measure || null;
  
  // Secondary outcomes from protocol
  const secondaryOutcomeNames = (protocol.outcomesModule?.secondaryOutcomes || [])
    .slice(0, 5)
    .map(o => o.measure);
  
  // Arms
  const arms: Array<{ name: string; description: string | null; sampleSize: number | null }> = [];
  
  // Get arm sample sizes from participant flow if available
  const flowGroups = results?.participantFlowModule?.groups || [];
  const armSizes: Record<string, number> = {};
  
  if (results?.participantFlowModule?.periods) {
    for (const period of results.participantFlowModule.periods) {
      for (const milestone of period.milestones || []) {
        if (milestone.type === "STARTED") {
          for (const achievement of milestone.achievements || []) {
            if (achievement.groupId && achievement.numSubjects) {
              armSizes[achievement.groupId] = parseInt(achievement.numSubjects) || 0;
            }
          }
        }
      }
    }
  }
  
  // Build arms list from protocol
  for (const armGroup of protocol.armsInterventionsModule?.armGroups || []) {
    const flowGroup = flowGroups.find(g => 
      g.title.toLowerCase().includes(armGroup.label.toLowerCase()) ||
      armGroup.label.toLowerCase().includes(g.title.toLowerCase())
    );
    arms.push({
      name: armGroup.label,
      description: armGroup.description || null,
      sampleSize: flowGroup ? armSizes[flowGroup.id] || null : null
    });
  }
  
  // Primary endpoints with results
  const primaryEndpoints: Array<{
    name: string;
    timeFrame: string | null;
    value: string | null;
    unit: string | null;
    hazardRatio: number | null;
    hrCiLower: number | null;
    hrCiUpper: number | null;
    pValue: number | null;
  }> = [];
  
  const secondaryEndpoints: Array<{
    name: string;
    timeFrame: string | null;
    value: string | null;
    unit: string | null;
    hazardRatio: number | null;
    hrCiLower: number | null;
    hrCiUpper: number | null;
    pValue: number | null;
  }> = [];
  
  // Process outcome measures from results
  const outcomeMeasures = results?.outcomeMeasuresModule?.outcomeMeasures || [];
  
  for (const outcome of outcomeMeasures) {
    const endpointData: {
      name: string;
      timeFrame: string | null;
      value: string | null;
      unit: string | null;
      hazardRatio: number | null;
      hrCiLower: number | null;
      hrCiUpper: number | null;
      pValue: number | null;
    } = {
      name: outcome.title,
      timeFrame: outcome.timeFrame || null,
      value: null,
      unit: outcome.unitOfMeasure || null,
      hazardRatio: null,
      hrCiLower: null,
      hrCiUpper: null,
      pValue: null
    };
    
    // Get first measurement value
    if (outcome.classes?.[0]?.categories?.[0]?.measurements?.[0]) {
      endpointData.value = outcome.classes[0].categories[0].measurements[0].value || null;
    }
    
    // Get statistical analysis (HR, CI, p-value)
    if (outcome.analyses?.[0]) {
      const analysis = outcome.analyses[0];
      
      // Parse hazard ratio from paramValue
      if (analysis.paramValue) {
        const hrValue = parseFloat(analysis.paramValue);
        if (!isNaN(hrValue)) {
          // Check if this is a hazard ratio analysis
          const method = (analysis.statisticalMethod || "").toLowerCase();
          if (method.includes("hazard") || method.includes("cox") || method.includes("survival")) {
            endpointData.hazardRatio = hrValue;
          }
        }
      }
      
      // CI bounds
      if (analysis.ciLowerLimit) {
        const lower = parseFloat(analysis.ciLowerLimit);
        if (!isNaN(lower)) endpointData.hrCiLower = lower;
      }
      if (analysis.ciUpperLimit) {
        const upper = parseFloat(analysis.ciUpperLimit);
        if (!isNaN(upper)) endpointData.hrCiUpper = upper;
      }
      
      // P-value
      if (analysis.pValue) {
        const pStr = analysis.pValue.replace(/[<>]/g, "").trim();
        const pValue = parseFloat(pStr);
        if (!isNaN(pValue)) {
          endpointData.pValue = pValue;
        }
      }
    }
    
    if (outcome.type === "PRIMARY") {
      primaryEndpoints.push(endpointData);
    } else {
      secondaryEndpoints.push(endpointData);
    }
  }
  
  // If no results section, create endpoint entries from protocol outcomes
  if (!hasResults && protocol.outcomesModule?.primaryOutcomes) {
    for (const outcome of protocol.outcomesModule.primaryOutcomes) {
      primaryEndpoints.push({
        name: outcome.measure,
        timeFrame: outcome.timeFrame || null,
        value: null,
        unit: null,
        hazardRatio: null,
        hrCiLower: null,
        hrCiUpper: null,
        pValue: null
      });
    }
  }
  
  return {
    hasResults,
    nctId,
    sampleSize,
    arms,
    primaryEndpoints,
    secondaryEndpoints,
    phase,
    designType,
    randomization,
    blinding,
    primaryOutcomeDescription,
    secondaryOutcomeNames
  };
}

function parseMedianFromValue(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trial_id, batch_size = 10, nct_id } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If specific NCT ID provided, fetch just that one
    if (nct_id) {
      const study = await fetchCTGovStudy(nct_id);
      if (!study) {
        return new Response(
          JSON.stringify({ error: "Study not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const extractedData = extractResultsData(study);
      return new Response(
        JSON.stringify({ 
          success: true, 
          study: study.protocolSection.identificationModule,
          results: extractedData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get trials that need ClinicalTrials.gov data
    let query = supabase
      .from("trials")
      .select("id, acronym, title, disease_area, results_summary, sample_size, phase, design_type, randomization, blinding, primary_endpoint, secondary_endpoints")
      .order("publication_year", { ascending: false });
    
    if (trial_id) {
      query = query.eq("id", trial_id);
    } else {
      // Get trials without CTGov data - filter using raw filter for JSONB
      query = query.or("results_summary.is.null,results_summary->nct_id.is.null")
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
    let skipped = 0;

    for (const trial of trials) {
      // Skip if already has CTGov data
      const existingSummary = (trial.results_summary as any) || {};
      if (existingSummary.nct_id && existingSummary.has_ctgov_results !== undefined) {
        console.log(`Skipping ${trial.acronym} - already has CTGov data`);
        skipped++;
        continue;
      }
      
      console.log(`Processing: ${trial.acronym}`);
      
      // Search ClinicalTrials.gov by acronym with disease area filter
      const trialForMatching = {
        acronym: trial.acronym,
        title: trial.title,
        disease_area: trial.disease_area,
        drugs: (trial as any).drugs || null
      };
      
      let searchResult = await searchCTGov(trial.acronym, trial.disease_area, trialForMatching);
      
      // If no results, try with title keywords
      if (searchResult.scoredStudies.length === 0) {
        const titleKeywords = trial.title.split(" ").slice(0, 5).join(" ");
        searchResult = await searchCTGov(titleKeywords, trial.disease_area, trialForMatching);
      }
      
      if (searchResult.scoredStudies.length === 0) {
        console.log(`No CTGov match for ${trial.acronym}`);
        continue;
      }
      
      // Get best scoring study
      const bestMatch = searchResult.scoredStudies[0];
      
      // Check if score meets minimum threshold
      if (bestMatch.score < MIN_CONFIDENCE_SCORE) {
        console.log(`No confident match for ${trial.acronym} - best score: ${bestMatch.score} (min: ${MIN_CONFIDENCE_SCORE})`);
        console.log(`  Best candidate: ${bestMatch.study.protocolSection.identificationModule.nctId}`);
        console.log(`  Reasons: ${bestMatch.reasons.join("; ")}`);
        continue;
      }
      
      const study = bestMatch.study;
      const nctId = study.protocolSection.identificationModule.nctId;
      console.log(`Matched ${trial.acronym} → ${nctId} (score: ${bestMatch.score})`);
      
      // Fetch full study details
      const fullStudy = await fetchCTGovStudy(nctId);
      if (!fullStudy) continue;
      
      const extractedData = extractResultsData(fullStudy);
      
      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Update basic fields if not already set
      if (!trial.sample_size && extractedData.sampleSize) {
        updateData.sample_size = extractedData.sampleSize;
      }
      if (!trial.phase && extractedData.phase) {
        updateData.phase = extractedData.phase;
      }
      if (!trial.design_type && extractedData.designType) {
        updateData.design_type = extractedData.designType;
      }
      if (!trial.randomization && extractedData.randomization) {
        updateData.randomization = extractedData.randomization;
      }
      if (!trial.blinding && extractedData.blinding) {
        updateData.blinding = extractedData.blinding;
      }
      if (!trial.primary_endpoint && extractedData.primaryOutcomeDescription) {
        updateData.primary_endpoint = extractedData.primaryOutcomeDescription;
      }
      if ((!trial.secondary_endpoints || trial.secondary_endpoints.length === 0) && extractedData.secondaryOutcomeNames.length > 0) {
        updateData.secondary_endpoints = extractedData.secondaryOutcomeNames;
      }
      
      // Build/update results summary with CTGov data
      const newSummary = {
        ...existingSummary,
        nct_id: nctId,
        has_ctgov_results: extractedData.hasResults,
        source: extractedData.hasResults ? "ClinicalTrials.gov results" : "ClinicalTrials.gov protocol",
        enrollment: extractedData.sampleSize || existingSummary.enrollment
      };
      
      // Add primary endpoint results
      if (extractedData.primaryEndpoints.length > 0) {
        const primary = extractedData.primaryEndpoints[0];
        
        if (primary.hazardRatio && !existingSummary.hazard_ratio) {
          newSummary.hazard_ratio = {
            value: primary.hazardRatio,
            ci_lower: primary.hrCiLower,
            ci_upper: primary.hrCiUpper
          };
        }
        if (primary.pValue && !existingSummary.p_value) {
          newSummary.p_value = primary.pValue;
        }
        
        // Check for OS/PFS data
        const primaryName = primary.name.toLowerCase();
        if (primaryName.includes("overall survival") || primaryName.includes(" os")) {
          const medianValue = parseMedianFromValue(primary.value);
          if (medianValue && !existingSummary.median_os_months) {
            newSummary.median_os_months = medianValue;
          }
        }
        if (primaryName.includes("progression") || primaryName.includes("pfs") || primaryName.includes("rpfs")) {
          const medianValue = parseMedianFromValue(primary.value);
          if (medianValue && !existingSummary.median_pfs_months) {
            newSummary.median_pfs_months = medianValue;
          }
        }
        
        newSummary.primary_endpoints = extractedData.primaryEndpoints.map(ep => ({
          name: ep.name,
          time_frame: ep.timeFrame,
          value: ep.value,
          unit: ep.unit,
          hr: ep.hazardRatio,
          hr_ci_lower: ep.hrCiLower,
          hr_ci_upper: ep.hrCiUpper,
          p_value: ep.pValue
        }));
      }
      
      // Add secondary endpoints
      if (extractedData.secondaryEndpoints.length > 0) {
        newSummary.secondary_endpoints = extractedData.secondaryEndpoints.slice(0, 10).map(ep => ({
          name: ep.name,
          time_frame: ep.timeFrame,
          value: ep.value,
          unit: ep.unit,
          hr: ep.hazardRatio,
          hr_ci_lower: ep.hrCiLower,
          hr_ci_upper: ep.hrCiUpper,
          p_value: ep.pValue
        }));
      }
      
      updateData.results_summary = newSummary;
      
      // Update trial
      const { error: updateError } = await supabase
        .from("trials")
        .update(updateData)
        .eq("id", trial.id);
      
      if (updateError) {
        console.error(`Error updating ${trial.acronym}:`, updateError);
        continue;
      }
      
      // Create/update arms if we have data and no existing arms
      if (extractedData.arms.length > 0) {
        const { data: existingArms } = await supabase
          .from("arms")
          .select("id, name")
          .eq("trial_id", trial.id);
        
        if (!existingArms || existingArms.length === 0) {
          for (const arm of extractedData.arms) {
            await supabase
              .from("arms")
              .insert({
                trial_id: trial.id,
                name: arm.name,
                description: arm.description,
                sample_size: arm.sampleSize
              });
          }
        }
      }
      
      // Create/update endpoints if we have results with HR data
      if (extractedData.primaryEndpoints.some(ep => ep.hazardRatio)) {
        const { data: existingEndpoints } = await supabase
          .from("endpoints")
          .select("id")
          .eq("trial_id", trial.id);
        
        if (!existingEndpoints || existingEndpoints.length === 0) {
          for (const endpoint of extractedData.primaryEndpoints) {
            if (endpoint.hazardRatio || endpoint.value) {
              await supabase
                .from("endpoints")
                .insert({
                  trial_id: trial.id,
                  endpoint_name: endpoint.name,
                  endpoint_type: "primary",
                  hazard_ratio: endpoint.hazardRatio,
                  hazard_ratio_ci_lower: endpoint.hrCiLower,
                  hazard_ratio_ci_upper: endpoint.hrCiUpper,
                  p_value: endpoint.pValue,
                  median_months: parseMedianFromValue(endpoint.value)
                });
            }
          }
        }
      }
      
      results.push({
        trial_id: trial.id,
        acronym: trial.acronym,
        nct_id: nctId,
        has_results: extractedData.hasResults,
        sample_size: extractedData.sampleSize,
        arms_count: extractedData.arms.length,
        primary_endpoints: extractedData.primaryEndpoints.length,
        has_hr: extractedData.primaryEndpoints.some(ep => ep.hazardRatio)
      });
      
      // Rate limiting - be respectful to ClinicalTrials.gov
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        skipped,
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
