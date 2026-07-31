import { describe, expect, it } from 'vitest';

import { capitalizeTherapyName } from './capitalizeTherapyName';

describe('capitalizeTherapyName', () => {
  it.each([
    ['trastuzumab emtansine (Kadcyla, T-DM1) — HER2+ borst', 'Trastuzumab emtansine (Kadcyla, T-DM1) — HER2+ Borst'],
    ['letrozole + abemaciclib - adjuvant', 'Letrozole + Abemaciclib - Adjuvant'],
    ['TCHP — docetaxel + carboplatin + trastuzumab + pertuzumab', 'TCHP — Docetaxel + Carboplatin + Trastuzumab + Pertuzumab'],
    ['FOLFOX / CAPOX — oxaliplatin-doublet', 'FOLFOX / CAPOX — Oxaliplatin-doublet'],
  ])('capitalizes therapy components in %s', (input, expected) => {
    expect(capitalizeTherapyName(input)).toBe(expected);
  });
});
