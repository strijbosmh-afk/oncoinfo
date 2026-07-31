import { describe, expect, it } from 'vitest';

import { combinationRegimenKey, dedupeCombinationRegimens } from './dedupeDrugs';
import type { Drug } from '@/types/drug';

function drug(overrides: Partial<Drug>): Drug {
  return {
    id: 'id',
    generic_name: 'Therapie',
    brand_names: [],
    drug_class: 'Combinatietherapie',
    disease_areas: ['Niercelcarcinoom'],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('dedupeCombinationRegimens', () => {
  it('recognizes parenthetical aliases and reversed component order', () => {
    expect(combinationRegimenKey('Nivolumab + Cabozantinib (Nivo-Cabo)'))
      .toBe(combinationRegimenKey('Cabozantinib + Nivolumab'));
  });

  it('merges duplicate combinations and preserves their metadata', () => {
    const result = dedupeCombinationRegimens([
      drug({ id: 'a', generic_name: 'Pembrolizumab + Axitinib', brand_names: ['Keytruda'], approved_indications: ['Eerstelijns'] }),
      drug({ id: 'b', generic_name: 'Pembrolizumab + Axitinib (Pembro-Axi)', brand_names: ['Inlyta'], approved_indications: ['Gemetastaseerd'], is_on_zvz: true }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
    expect(result[0].brand_names).toEqual(expect.arrayContaining(['Keytruda', 'Inlyta']));
    expect(result[0].approved_indications).toEqual(expect.arrayContaining(['Eerstelijns', 'Gemetastaseerd']));
  });

  it('does not merge individual medicines', () => {
    const result = dedupeCombinationRegimens([
      drug({ id: 'a', generic_name: 'Nivolumab', drug_class: 'IO/ICI' }),
      drug({ id: 'b', generic_name: 'Nivolumab', drug_class: 'IO/ICI' }),
    ]);

    expect(result).toHaveLength(2);
  });
});
