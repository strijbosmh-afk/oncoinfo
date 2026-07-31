import { describe, expect, it } from 'vitest';
import { normalizeDischargeTemplateDiscipline } from './dischargeTemplateClassification';

describe('normalizeDischargeTemplateDiscipline', () => {
  it('does not mistake a partial word for the BEP regimen', () => {
    expect(normalizeDischargeTemplateDiscipline({
      discipline: 'Borstkanker',
      title: 'Nazorg',
      content: 'De inspanningen blijven tijdelijk beperkt.',
    })).toBe('Borstkanker');
  });

  it('canonicalizes common source headings', () => {
    expect(normalizeDischargeTemplateDiscipline({
      discipline: 'Urotheelcarcinoom',
      title: 'Algemene opvolging',
      content: 'Controle volgens afspraak.',
    })).toBe('Blaaskanker');
  });

  it('overrides a wrong heading when multiple specific signals agree', () => {
    expect(normalizeDischargeTemplateDiscipline({
      discipline: 'Niercelcarcinoom',
      title: 'Darolutamide (Nubeqa)',
      content: 'Behandeling bij mHSPC.',
    })).toBe('Prostaatkanker');
  });

  it('classifies carboplatin mono AUC7 as testicular cancer', () => {
    expect(normalizeDischargeTemplateDiscipline({
      discipline: 'Oncologie',
      title: 'Carboplatine mono AUC 7',
      content: 'Ter info: carboplatine mono AUC 7',
    })).toBe('Testiskanker');
  });

  it('keeps PARP and immunotherapy regimens under a canonical gynaecology heading', () => {
    expect(normalizeDischargeTemplateDiscipline({
      discipline: 'Gynaecologische oncologie',
      title: 'Olaparib',
      content: 'Onderhoudsbehandeling met een PARP inhibitor.',
    })).toBe('Gynaecologische oncologie');

    expect(normalizeDischargeTemplateDiscipline({
      discipline: 'Gynaecologische oncologie',
      title: 'Carboplatine-paclitaxel met pembrolizumab',
      content: 'Immunotherapie voor endometriumcarcinoom.',
    })).toBe('Gynaecologische oncologie');
  });

  it.each([
    ['Dostarlimab (Jemperli)', 'endometriumcarcinoom'],
    ['Tisotumab vedotin (Tivdak)', 'cervixcarcinoom'],
    ['Mirvetuximab (Elahere)', 'ovariumcarcinoom'],
  ])('recognizes gynaecological regimen %s', (title, content) => {
    expect(normalizeDischargeTemplateDiscipline({ discipline: 'Oncologie', title, content }))
      .toBe('Gynaecologische oncologie');
  });
});
