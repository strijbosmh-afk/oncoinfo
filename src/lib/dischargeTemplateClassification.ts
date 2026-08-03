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
      'tolaney', 'apt-regime', 'apt schema',
      'ribociclib', 'palbociclib', 'abemaciclib', 'trastuzumab', 'pertuzumab',
      'sacituzumab', 'trastuzumab deruxtecan',
    ],
  },
  {
    discipline: 'Respiratoire oncologie',
    terms: [
      'nsclc', 'sclc', 'longkanker', 'longcarcinoom', 'mesothelioom', 'osimertinib',
      'alectinib', 'lorlatinib', 'durvalumab', 'sotorasib',
    ],
  },
  {
    discipline: 'Digestieve oncologie',
    terms: [
      'colorectaal', 'colon', 'rectum', 'pancreas', 'maag', 'oesofagus', 'slokdarm',
      'galweg', 'cholangiocarcinoom', 'hepatocellulair', 'gist', 'folfox', 'folfiri',
    ],
  },
  {
    discipline: 'Gynaecologische oncologie',
    terms: [
      'ovarium', 'eierstok', 'endometrium', 'cervix', 'vulva', 'gynaecologisch',
      'topotecan', 'niraparib', 'zejula', 'rucaparib', 'rubraca', 'olaparib', 'lynparza',
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
  nierkanker: 'Niercelcarcinoom',
  nier: 'Niercelcarcinoom',
  prostaat: 'Prostaatkanker',
  blaas: 'Blaaskanker',
  testis: 'Testiskanker',
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
    return text.includes(normalizedTerm) ? score + 1 : score;
  }, 0);
}

export function normalizeDischargeTemplateDiscipline(template: {
  discipline?: string | null;
  title?: string | null;
  content?: string | null;
}) {
  const current = (template.discipline || '').trim();
  const haystack = normalizeText(`${template.title || ''}\n${template.content || ''}`);

  const scored = DISCIPLINE_RULES
    .map((rule) => ({
      discipline: rule.discipline,
      score: countTermMatches(haystack, rule.terms),
    }))
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const best = scored[0];
    const currentScore = scored.find((rule) => rule.discipline === current)?.score || 0;
    if (best.score >= 2 || currentScore === 0) return best.discipline;
  }

  const normalizedCurrent = normalizeText(current);
  return DISCIPLINE_ALIASES[normalizedCurrent] || current || 'Indicatie-overstijgende teksten';
}
