import { describe, expect, it } from 'vitest';

import { mergeDischargeTemplates } from './dischargeTemplateMerge';

describe('mergeDischargeTemplates', () => {
  const documents = [
    { id: 'hospital', document_title: 'Ziekenhuis', uploaded_at: '2026-07-31' },
    { id: 'platform', document_title: 'Platform', uploaded_at: '2026-07-30' },
  ];

  it('combines templates from every visible current document', () => {
    const result = mergeDischargeTemplates(documents, [
      { id: '1', document_id: 'hospital', discipline: 'Borstkanker', title: 'Tolaney', content: 'HER2 borstkanker', display_order: 1 },
      { id: '2', document_id: 'platform', discipline: 'Respiratoire oncologie', title: 'PACIFIC', content: 'NSCLC', display_order: 1 },
    ]);

    expect(result.map((template) => template.title)).toEqual(['Tolaney', 'PACIFIC']);
  });

  it('keeps the newest visible version when titles overlap', () => {
    const result = mergeDischargeTemplates(documents, [
      { id: 'old', document_id: 'platform', discipline: 'Borstkanker', title: 'Zelfde titel', content: 'oud', display_order: 1 },
      { id: 'new', document_id: 'hospital', discipline: 'Borstkanker', title: 'Zelfde titel', content: 'nieuw', display_order: 2 },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('nieuw');
    expect(result[0].content).not.toContain('oud');
  });
});
