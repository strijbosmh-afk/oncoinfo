import { describe, expect, it } from 'vitest';

import { formatDischargeTemplateContent } from './dischargeTemplateFormat';

describe('formatDischargeTemplateContent', () => {
  it('normalizes an existing template to the required format', () => {
    const formatted = formatDischargeTemplateContent({
      discipline: 'Digestieve oncologie',
      title: 'durvalumab + tremelimumab (STRIDE) — 1e lijn HCC',
      content: `Uitleg over de therapie.
Verwachte nevenwerkingen
• Vermoeidheid
• Diarree
- Indicaties tot verwijzing door de huisarts:
Koorts
Dyspneu`,
    });

    expect(formatted).toBe(`Ter info: durvalumab + tremelimumab (STRIDE) - 1e lijn HCC
--------------------------------------
Uitleg over de therapie.

Verwachte nevenwerkingen
- Vermoeidheid
- Diarree

Indicaties doorverwijzing
- Koorts
- Dyspneu`);
  });

  it('keeps the structure complete without inventing missing medical details', () => {
    const formatted = formatDischargeTemplateContent({
      discipline: 'Borstkanker',
      title: 'Nieuwe therapie',
      content: 'Korte uitleg.',
    });

    expect(formatted).toContain('Ter info: Nieuwe therapie - Borstkanker');
    expect(formatted.match(/Niet gespecificeerd in het brondocument\./g)).toHaveLength(2);
  });
});
