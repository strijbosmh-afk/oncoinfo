import { describe, expect, it } from 'vitest';

import { generateStaticPreviewHtml } from './PatientFolderPreviewStatic';

const drug = {
  generic_name: 'Testmedicatie',
  brand_names: ['Voorbeeld'],
  side_effects: {
    common: ['Misselijkheid', 'Vermoeidheid'],
    serious: ['Koorts'],
  },
};

describe('generateStaticPreviewHtml print layout', () => {
  it('reserves a footer margin and allows long folder sections to flow across pages', () => {
    const html = generateStaticPreviewHtml(
      drug,
      'Dr. Test',
      'Verpleegkundige Test',
      'nl',
      '012 34 56 78',
      true,
      true,
    );

    expect(html).toContain('@page { size: A4; margin: 12mm 12mm 24mm; }');
    expect(html).toContain('.content { display: block; }');
    expect(html).toContain('.section { break-inside: auto; page-break-inside: auto;');
    expect(html).toContain('p, li { orphans: 3; widows: 3; }');
    expect(html).toContain('bottom: -19mm');
  });

  it('marks individual side effects as safe, indivisible print rows', () => {
    const html = generateStaticPreviewHtml(
      drug,
      '',
      '',
      'nl',
      '',
      false,
      true,
    );

    expect(html).toContain('class="se-category"');
    expect(html).toContain('class="se-item"');
    expect(html).toContain('.se-item, .print-disclaimer { break-inside: avoid;');
  });
});
