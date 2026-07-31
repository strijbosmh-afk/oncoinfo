export const DISCHARGE_TEMPLATE_DISCIPLINES = [
  'Borstkanker',
  'Prostaatkanker',
  'Blaaskanker',
  'Niercelcarcinoom',
  'Testiskanker',
  'Peniskanker',
  'Gynaecologische oncologie',
  'Respiratoire oncologie',
  'Digestieve oncologie',
  'Huidtumoren',
  'Hoofd-halsoncologie',
  'Supportive care',
  'Indicatie-overstijgende teksten',
] as const;

type DisciplineRule = {
  discipline: string;
  terms: string[];
};

const DISCIPLINE_RULES: DisciplineRule[] = [
  {
    discipline: 'Prostaatkanker',
    terms: [
      'prostaat', 'prostate', 'mcrpc', 'mhspc', 'nmcrpc', 'psa',
      'darolutamide', 'nubeqa', 'enzalutamide', 'xtandi', 'apalutamide', 'erleada',
      'abiraterone', 'zytiga', 'cabazitaxel', 'jevtana', 'radium-223', 'xofigo',
      'lutetium-psma', 'lu-psma', 'pluvicto', 'degarelix', 'firmagon',
      'relugolix', 'leuproreline', 'gosereline', 'goserelin',
    ],
  },
  {
    discipline: 'Niercelcarcinoom',
    terms: [
      'niercel', 'niercelcarcinoom', 'renal cell', 'rcc', 'clear cell', 'heldercellig',
      'nierkanker', 'kidney cancer', 'cabozantinib', 'cabometyx', 'axitinib', 'inlyta',
      'pazopanib', 'votrient', 'sunitinib', 'sutent', 'tivozanib', 'fotivda',
      'belzutifan', 'welireg', 'lenvatinib', 'everolimus',
    ],
  },
  {
    discipline: 'Blaaskanker',
    terms: [
      'blaas', 'urotheel', 'urotheelcarcinoom', 'urothelial', 'bladder',
      'enfortumab', 'padcev', 'erdafitinib', 'balversa', 'avelumab', 'bavencio',
    ],
  },
  {
    discipline: 'Testiskanker',
    terms: [
      'testis', 'testikel', 'kiemceltumor', 'germ cell', 'seminoom', 'non-seminoom',
      'bep', 'bleomycine etoposide cisplatine', 'tip schema',
      'carboplatine mono auc7', 'carboplatine mono auc 7', 'carbo mono auc7', 'carbo mono auc 7',
    ],
  },
  {
    discipline: 'Peniskanker',
    terms: ['penis', 'peniskanker', 'penile'],
  },
  {
    discipline: 'Borstkanker',
    terms: [
      'borst', 'mamma', 'breast', 'her2', 'hr+', 'triple negatief', 'tnbc',
      'ribociclib', 'palbociclib', 'abemaciclib', 'trastuzumab', 'pertuzumab',
      'sacituzumab', 'trastuzumab deruxtecan',
      'tolaney',
    ],
  },
  {
    discipline: 'Respiratoire oncologie',
    terms: [
      'nsclc', 'sclc', 'longkanker', 'longcarcinoom', 'mesothelioom', 'osimertinib',
      'alectinib', 'lorlatinib', 'durvalumab', 'sotorasib', 'pacific', 'caspian',
    ],
  },
  {
    discipline: 'Digestieve oncologie',
    terms: [
      'colorectaal', 'colon', 'rectum', 'pancreas', 'maag', 'oesofagus', 'slokdarm',
      'galweg', 'galwegen', 'cholangiocarcinoom', 'hepatocellulair', 'hcc', 'gist',
      'folfox', 'folfiri', 'topaz-1', 'himalaya',
    ],
  },
  {
    discipline: 'Gynaecologische oncologie',
    terms: [
      'ovarium', 'eierstok', 'endometrium', 'cervix', 'vulva', 'gynaecologisch',
      'niraparib', 'rucaparib', 'parp-inhibitor', 'parp inhibitor',
      'dostarlimab', 'jemperli', 'tisotumab vedotin', 'tivdak',
      'mirvetuximab', 'elahere',
    ],
  },
  {
    discipline: 'Huidtumoren',
    terms: ['melanoom', 'merkel', 'cutaan', 'huidtumor', 'cemiplimab'],
  },
  {
    discipline: 'Hoofd-halsoncologie',
    terms: ['hoofd-hals', 'nasofarynx', 'speekselklier', 'hnscc'],
  },
  {
    discipline: 'Supportive care',
    terms: ['anti-emese', 'antiemetica', 'g-csf', 'pegfilgrastim', 'denosumab', 'zoledronaat'],
  },
];

const DISCIPLINE_ALIASES: Record<string, string> = {
  borstkanker: 'Borstkanker',
  mammaoncologie: 'Borstkanker',
  nierkanker: 'Niercelcarcinoom',
  nier: 'Niercelcarcinoom',
  niercelcarcinoom: 'Niercelcarcinoom',
  prostaat: 'Prostaatkanker',
  prostaatkanker: 'Prostaatkanker',
  blaas: 'Blaaskanker',
  blaaskanker: 'Blaaskanker',
  urotheelcarcinoom: 'Blaaskanker',
  urotheelcarcinomen: 'Blaaskanker',
  testis: 'Testiskanker',
  testiskanker: 'Testiskanker',
  peniskanker: 'Peniskanker',
  gynaecologischeoncologie: 'Gynaecologische oncologie',
  respiratoireoncologie: 'Respiratoire oncologie',
  longkanker: 'Respiratoire oncologie',
  digestieveoncologie: 'Digestieve oncologie',
  huidtumoren: 'Huidtumoren',
  hoofdhalsoncologie: 'Hoofd-halsoncologie',
  supportivecare: 'Supportive care',
  indicatieoverstijgendeteksten: 'Indicatie-overstijgende teksten',
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function countTermMatches(text: string, terms: string[]) {
  return terms.reduce((score, term) => {
    const normalizedTerm = normalizeText(term);
    // Match complete medical terms. Plain `includes` classified ordinary words such
    // as "beperkt" as BEP (testicular cancer), which scattered templates across
    // unrelated disciplines.
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i');
    return pattern.test(text) ? score + 1 : score;
  }, 0);
}

export function normalizeDischargeTemplateDiscipline(template: {
  discipline?: string | null;
  title?: string | null;
  content?: string | null;
}) {
  const current = (template.discipline || '').trim();
  const haystack = normalizeText(`${template.title || ''}\n${template.content || ''}`);
  const normalizedCurrent = normalizeText(current).replace(/[^a-z0-9]+/g, '');
  const canonicalCurrent = DISCIPLINE_ALIASES[normalizedCurrent];

  const scored = DISCIPLINE_RULES
    .map((rule) => ({
      discipline: rule.discipline,
      score: countTermMatches(haystack, rule.terms),
    }))
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const best = scored[0];
    const currentScore = scored.find((rule) => rule.discipline === canonicalCurrent)?.score || 0;
    if (!canonicalCurrent || (best.discipline !== canonicalCurrent && best.score >= 2 && best.score > currentScore)) {
      return best.discipline;
    }
  }

  return canonicalCurrent || current || 'Indicatie-overstijgende teksten';
}
