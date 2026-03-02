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
  standard?: string;
  dose_adjustments?: {
    condition: string;
    adjustment: string;
  }[] | string;
  adjustments?: string;
  max_dose?: string;
  frequency?: string;
  duration?: string;
  cycles?: string;
  induction?: string;
  maintenance?: string;
  neoadjuvant_phase1?: string;
  neoadjuvant_phase1_duration?: string;
  neoadjuvant_phase2?: string;
  neoadjuvant_phase2_duration?: string;
  adjuvant?: string;
  adjuvant_duration?: string;
  alternative?: string;
  classic_mvac?: string;
  notes?: string;
  [key: string]: string | { condition: string; adjustment: string }[] | undefined;
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
  'ARTA',
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
  'BRAF/MEK-remmer',
  'KRAS-remmer',
  'FGFR-remmer',
] as const;

export const COMBINATION_SUBTYPES = [
  'IO + Chemotherapie',
  'IO + TKI', 
  'IO + IO',
  'ARTA + Chemotherapie',
  'ARTA + IO'
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
  'Colorectaal carcinoom',
  'Maagcarcinoom',
  'Oesofaguscarcinoom',
  'Pancreascarcinoom',
  'Hepatocellulair carcinoom',
  'Galwegcarcinoom',
  'Melanoom',
  'Merkelcelcarcinoom',
  'Cutaan plaveiselcelcarcinoom',
  'Hoofd-halscarcinoom',
  'Nasofarynxcarcinoom',
  'Speekselkliercarcinoom',
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
    drugClasses: ['ARTA', 'Anti-hormonale therapie', 'Chemotherapie', 'IO/ICI', 'TKI', 'PARPi', 'Radioligand Therapie', 'Antiresorptiva']
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
  digestive: {
    name: 'Digestieve',
    diseaseAreas: [
      { key: 'colorectal', label: 'Colorectaal carcinoom', description: 'Colon- en rectumcarcinoom' },
      { key: 'gastric', label: 'Maagcarcinoom', description: 'Maag- en slokdarmkanker' },
      { key: 'esophageal', label: 'Oesofaguscarcinoom', description: 'Slokdarmkanker' },
      { key: 'pancreatic', label: 'Pancreascarcinoom', description: 'Alvleesklierkanker' },
      { key: 'hepatocellular', label: 'Hepatocellulair carcinoom', description: 'Levercelkanker (HCC)' },
      { key: 'biliary', label: 'Galwegcarcinoom', description: 'Galweg- en galblaaskanker' }
    ],
    drugClasses: ['Chemotherapie', 'IO/ICI', 'EGFR-remmer', 'Angiogeneseremmer', 'TKI', 'Combinatietherapie', 'HER2-remmers', 'PARPi']
  },
  skin: {
    name: 'Huid',
    diseaseAreas: [
      { key: 'melanoma', label: 'Melanoom', description: 'Cutaan melanoom' },
      { key: 'merkel', label: 'Merkelcelcarcinoom', description: 'Merkelcelcarcinoom' },
      { key: 'cutaneous_scc', label: 'Cutaan plaveiselcelcarcinoom', description: 'Cutaan SCC' }
    ],
    drugClasses: ['IO/ICI', 'BRAF/MEK-remmer', 'Combinatietherapie']
  },
  head_neck: {
    name: 'Hoofd & Hals',
    diseaseAreas: [
      { key: 'hnscc', label: 'Hoofd-halscarcinoom', description: 'Plaveiselcelcarcinoom hoofd-hals' },
      { key: 'nasopharyngeal', label: 'Nasofarynxcarcinoom', description: 'Nasofarynxcarcinoom' },
      { key: 'salivary', label: 'Speekselkliercarcinoom', description: 'Speekselklierkanker' }
    ],
    drugClasses: ['Chemotherapie', 'IO/ICI', 'EGFR-remmer', 'Combinatietherapie']
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
