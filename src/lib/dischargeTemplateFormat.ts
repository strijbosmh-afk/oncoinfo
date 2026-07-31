const SEPARATOR = '--------------------------------------';
const MISSING_SOURCE_TEXT = 'Niet gespecificeerd in het brondocument.';

function cleanTitle(title: string, discipline: string) {
  const cleaned = title
    .replace(/^\s*ter info:\s*/i, '')
    .replace(/\s*[—–]\s*/g, ' - ')
    .trim();
  return cleaned.includes(' - ') ? cleaned : `${cleaned} - ${discipline}`;
}

function asBullets(lines: string[]) {
  const items = lines
    .map((line) => line.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);
  return (items.length > 0 ? items : [MISSING_SOURCE_TEXT])
    .map((item) => `- ${item}`)
    .join('\n');
}

export function formatDischargeTemplateContent(template: {
  discipline: string;
  title: string;
  content: string;
}) {
  const lines = template.content.replace(/\r/g, '').split('\n');
  const explanation: string[] = [];
  const sideEffects: string[] = [];
  const referrals: string[] = [];
  let section: 'explanation' | 'sideEffects' | 'referrals' = 'explanation';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^ter info:/i.test(line) || /^-{3,}$/.test(line)) continue;
    if (/^verwachte nevenwerkingen\s*:?$/i.test(line)) {
      section = 'sideEffects';
      continue;
    }
    if (/^-?\s*(indicaties?(?: tot)? (?:door)?verwijzing.*|contacteer .* bij)\s*:?$/i.test(line)) {
      section = 'referrals';
      continue;
    }

    if (section === 'sideEffects') sideEffects.push(line);
    else if (section === 'referrals') referrals.push(line);
    else explanation.push(line);
  }

  const therapyTitle = cleanTitle(template.title, template.discipline);
  const explanationText = explanation.length > 0
    ? explanation.map((line) => line.replace(/^\s*[-•]\s*/, '').trim()).join('\n')
    : MISSING_SOURCE_TEXT;

  return [
    `Ter info: ${therapyTitle}`,
    SEPARATOR,
    explanationText,
    '',
    'Verwachte nevenwerkingen',
    asBullets(sideEffects),
    '',
    'Indicaties doorverwijzing',
    asBullets(referrals),
  ].join('\n');
}
