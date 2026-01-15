export interface Trial {
  id: string;
  acronym: string;
  title: string;
  disease_area: string;
  setting?: string;
  line_of_therapy?: string;
  phase?: string;
  design_type?: string;
  randomization?: string;
  blinding?: string;
  sample_size?: number;
  primary_endpoint?: string;
  primary_endpoint_met?: boolean | null;
  secondary_endpoints?: string[];
  intervention_classes?: string[];
  drugs?: string[];
  biomarkers?: string[];
  inclusion_criteria?: InclusionExclusionCriteria;
  exclusion_criteria?: InclusionExclusionCriteria;
  results_summary?: ResultsSummary;
  safety_highlights?: string;
  pubmed_id?: string;
  doi?: string;
  journal?: string;
  publication_year?: number;
  authors?: string[];
  abstract?: string;
  citation?: string;
  original_km_plot_url?: string;
  is_open_access?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface InclusionExclusionCriteria {
  disease_status?: string[];
  prior_therapy?: string[];
  biomarkers?: string[];
  performance_status?: string[];
  other?: string[];
}

export interface ResultsSummary {
  enrollment?: number;
  primary_outcome?: string;
  key_findings?: string[];
  conclusions?: string;
  // PubMed/CTGov extracted fields
  source?: string;
  nct_id?: string;
  has_ctgov_results?: boolean;
  hazard_ratio?: {
    value?: number;
    ci_lower?: number;
    ci_upper?: number;
  };
  p_value?: number;
  median_os_months?: number;
  median_pfs_months?: number;
  primary_endpoints?: Array<{
    name: string;
    time_frame?: string;
    value?: string;
    unit?: string;
    hr?: number;
    hr_ci_lower?: number;
    hr_ci_upper?: number;
    p_value?: number;
  }>;
  secondary_endpoints?: Array<{
    name: string;
    time_frame?: string;
    value?: string;
    unit?: string;
    hr?: number;
    hr_ci_lower?: number;
    hr_ci_upper?: number;
    p_value?: number;
  }>;
}

export interface Arm {
  id: string;
  trial_id: string;
  name: string;
  description?: string;
  sample_size?: number;
  treatment_details?: string;
  created_at: string;
}

export interface Endpoint {
  id: string;
  trial_id: string;
  arm_id?: string;
  endpoint_name: string;
  endpoint_type: string;
  hazard_ratio?: number;
  hazard_ratio_ci_lower?: number;
  hazard_ratio_ci_upper?: number;
  p_value?: number;
  median_months?: number;
  rate_percent?: number;
  rate_timepoint_months?: number;
  survival_timepoints?: SurvivalTimepoint[];
  created_at: string;
}

export interface SurvivalTimepoint {
  months: number;
  survival_rate: number;
  arm?: string;
}

export interface AISummary {
  id: string;
  trial_id: string;
  summary_type: 'design' | 'strengths_weaknesses' | 'similar_trials';
  content: DesignSummary | StrengthsWeaknesses | SimilarTrials;
  version: number;
  is_current: boolean;
  generated_at: string;
  generated_by?: string;
}

export interface DesignSummary {
  phase?: string;
  randomization?: string;
  stratification?: string[];
  blinding?: string;
  population?: string;
  treatment_arms?: string[];
  endpoints?: string[];
  statistics?: string;
}

export interface StrengthsWeaknesses {
  strengths: string[];
  weaknesses: string[];
  overall_assessment?: string;
}

export interface SimilarTrials {
  trials: {
    id: string;
    acronym: string;
    similarity_reason: string;
  }[];
}

export interface TrialFilters {
  disease_area?: string[];
  setting?: string[];
  line_of_therapy?: string[];
  phase?: string[];
  intervention_class?: string[];
  biomarker?: string[];
  publication_year?: number[];
  journal?: string[];
  search?: string;
}

export const DISEASE_AREAS = [
  'Prostate Cancer',
  'Bladder Cancer',
  'Renal Cell Carcinoma',
  'Testicular Cancer',
  'Penile Cancer'
] as const;

export const INTERVENTION_CLASSES = [
  'IO/ICI',
  'PARPi',
  'ARPI',
  'Chemotherapy',
  'Radioligand Therapy',
  'Radiation Therapy',
  'Surgery',
  'Targeted Therapy',
  'ADC'
] as const;

export const PHASES = [
  'Phase I',
  'Phase I/II',
  'Phase II',
  'Phase II/III',
  'Phase III',
  'Phase IV'
] as const;

export const SETTINGS = [
  'Localized',
  'Locally Advanced',
  'Metastatic',
  'Adjuvant',
  'Neoadjuvant',
  'Maintenance',
  'Salvage'
] as const;