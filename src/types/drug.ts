export interface Drug {
  id: string;
  generic_name: string;
  brand_names: string[];
  drug_class: string;
  mechanism_of_action?: string;
  disease_areas: string[];
  approved_indications?: string[];
  common_regimens?: string[];
  dosing_info?: DosingInfo;
  administration_route?: string;
  cycle_length_days?: number;
  side_effects?: SideEffects;
  contraindications?: string[];
  drug_interactions?: string[];
  monitoring_requirements?: string[];
  patient_counseling_points?: string[];
  ema_approval_date?: string;
  fda_approval_date?: string;
  is_on_zvz?: boolean;
  unit_price?: number | null;
  price_unit?: string | null;
  reference_links?: string[];
  created_at: string;
  updated_at: string;
}

export interface DosingInfo {
  standard_dose?: string;
  dose_adjustments?: {
    condition: string;
    adjustment: string;
  }[];
  max_dose?: string;
  frequency?: string;
  duration?: string;
}

export interface SideEffects {
  common?: string[];
  serious?: string[];
  management?: {
    [key: string]: string;
  };
}

export interface DrugFilters {
  drug_class?: string[];
  disease_area?: string[];
  administration_route?: string[];
  search?: string;
}

export const DRUG_CLASSES = [
  'Immunotherapie (IO/ICI)',
  'PARPi',
  'ARPI',
  'Chemotherapie',
  'TKI',
  'ADC',
  'Radioligand Therapie',
  'Hormonale Therapie',
  'Bifosfonaten',
  'Supportive Care'
] as const;

export const ADMINISTRATION_ROUTES = [
  'Oraal',
  'Intraveneus',
  'Subcutaan',
  'Intramusculair',
  'Intravesicaal'
] as const;

export const DRUG_DISEASE_AREAS = [
  'Prostaatkanker',
  'Blaaskanker',
  'Niercelcarcinoom',
  'Testiskanker',
  'Peniskanker'
] as const;
