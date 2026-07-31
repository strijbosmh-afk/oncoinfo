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
});
