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
  veel_voorkomend?: string[];
  ernstig?: string[];
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
  'Antiresorptiva',
  'Combinatietherapie',
  'Supportive Care',
  'HER2-remmers',
  'CDK4/6i',
  'ALK-remmer',
  'EGFR-remmer',
  'Angiogeneseremmer',
] as const;

export const COMBINATION_SUBTYPES = [
  'IO + Chemotherapie',
  'IO + TKI', 
  'IO + IO',
  'ARPI + Chemotherapie',
  'ARPI + IO'
] as const;

export const ADMINISTRATION_ROUTES = [
  'Oraal',
  'Intraveneus',
  'Subcutaan',
  'Intramusculair',
  'Intravesicaal'
] as const;

export const DRUG_DISEASE_AREAS = [
  'Borstkanker',
  'Prostaatkanker',
  'Blaaskanker',
  'Niercelcarcinoom',
  'Testiskanker',
  'Peniskanker',
  'Ovariumcarcinoom',
  'Endometriumcarcinoom',
  'Cervixcarcinoom',
  'Vulvacarcinoom',
  'NSCLC',
  'SCLC',
  'Mesothelioom',
  'Supportive Care',
] as const;

// Category configurations for the drug library
export const DRUG_CATEGORIES = {
  breast: {
    name: 'Borstkanker',
    subtypes: [
      { key: 'hr_positive', label: 'Hormoongevoelig (HR+)', description: 'ER+ en/of PR+ tumoren' },
      { key: 'her2_positive', label: 'HER2-positief', description: 'HER2-overexpressie of -amplificatie' },
      { key: 'triple_negative', label: 'Triple negatief', description: 'ER-, PR-, HER2-' }
    ],
    stages: [
      { key: 'neoadjuvant_adjuvant', label: 'Neoadjuvant/Adjuvant', description: 'Vroeg stadium' },
      { key: 'metastatic', label: 'Gemetastaseerd', description: 'Stadium IV' }
    ],
    drugClasses: ['Chemotherapie', 'Hormoontherapie', 'HER2-remmers', 'CDK4/6i', 'IO/ICI', 'ADC', 'PARPi']
  },
  urology: {
    name: 'Urologie',
    diseaseAreas: [
      { key: 'prostate', label: 'Prostaatkanker', description: 'mCRPC, mHSPC, gelokaliseerd' },
      { key: 'bladder', label: 'Blaaskanker', description: 'NMIBC, MIBC, gemetastaseerd' },
      { key: 'kidney', label: 'Niercelcarcinoom', description: 'Heldercellig, niet-heldercellig' },
      { key: 'testis', label: 'Testiskanker', description: 'Seminoom, non-seminoom' },
      { key: 'penile', label: 'Peniskanker', description: 'Plaveiselcelcarcinoom' }
    ],
    drugClasses: ['ARPI', 'Chemotherapie', 'IO/ICI', 'TKI', 'PARPi', 'Radioligand Therapie', 'Hormonale Therapie', 'Antiresorptiva']
  },
  gynecology: {
    name: 'Gynaecologie',
    diseaseAreas: [
      { key: 'ovarian', label: 'Ovariumcarcinoom', description: 'Epitheliaal, kiemcel' },
      { key: 'endometrial', label: 'Endometriumcarcinoom', description: 'Type I en II' },
      { key: 'cervical', label: 'Cervixcarcinoom', description: 'Plaveiselcel, adenocarcinoom' },
      { key: 'vulvar', label: 'Vulvacarcinoom', description: 'Plaveiselcelcarcinoom' }
    ],
    drugClasses: ['Chemotherapie', 'PARPi', 'Antiangiogenese', 'IO/ICI', 'Hormoontherapie']
  },
  respiratory: {
    name: 'Respiratoire',
    diseaseAreas: [
      { key: 'nsclc', label: 'NSCLC', description: 'Niet-kleincellig longcarcinoom' },
      { key: 'sclc', label: 'SCLC', description: 'Kleincellig longcarcinoom' },
      { key: 'mesothelioma', label: 'Mesothelioom', description: 'Pleuraal mesothelioom' }
    ],
    drugClasses: ['Chemotherapie', 'IO/ICI', 'ALK-remmer', 'EGFR-remmer', 'TKI', 'Angiogeneseremmer', 'Combinatietherapie']
  },
  other: {
    name: 'Overige',
    subcategories: [
      { key: 'antiresorptive', label: 'Antiresorptiva', description: 'Botbeschermende medicatie' },
      { key: 'antiemetic', label: 'Anti-emetica', description: 'Misselijkheidsbehandeling' },
      { key: 'gcsf', label: 'G-CSF', description: 'Groeifactoren' },
      { key: 'erythropoietin', label: 'Erytropoietines', description: 'Erytropoëse-stimulerende middelen' },
      { key: 'thrombopoietin', label: 'Trombopoietine-agonisten', description: 'Trombocytenstimulatie' },
      { key: 'supportive', label: 'Overige supportive care', description: 'Overige ondersteunende medicatie' }
    ],
    drugClasses: ['Antiresorptiva', 'Supportive Care']
  }
} as const;

export type DrugCategoryKey = keyof typeof DRUG_CATEGORIES;
