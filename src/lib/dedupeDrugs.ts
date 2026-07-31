import type { Drug } from '@/types/drug';

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function combinationRegimenKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(schema|regime|regimen)\b/g, ' ')
    .split('+')
    .map((part) => part.replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean)
    .sort()
    .join('+');
}

function completenessScore(drug: Drug) {
  return (drug.is_on_zvz ? 100 : 0)
    + drug.brand_names.length
    + drug.disease_areas.length
    + (drug.approved_indications?.length || 0)
    + (drug.common_regimens?.length || 0);
}

export function dedupeCombinationRegimens(drugs: Drug[]): Drug[] {
  const output: Drug[] = [];
  const combinationIndex = new Map<string, number>();

  for (const drug of drugs) {
    if (drug.drug_class !== 'Combinatietherapie') {
      output.push(drug);
      continue;
    }

    const key = combinationRegimenKey(drug.generic_name);
    const existingIndex = combinationIndex.get(key);
    if (existingIndex === undefined || !key) {
      combinationIndex.set(key, output.length);
      output.push(drug);
      continue;
    }

    const existing = output[existingIndex];
    const preferred = completenessScore(drug) > completenessScore(existing) ? drug : existing;
    const other = preferred === drug ? existing : drug;
    output[existingIndex] = {
      ...preferred,
      brand_names: unique([...preferred.brand_names, ...other.brand_names]),
      disease_areas: unique([...preferred.disease_areas, ...other.disease_areas]),
      approved_indications: unique([
        ...(preferred.approved_indications || []),
        ...(other.approved_indications || []),
      ]),
      common_regimens: unique([
        ...(preferred.common_regimens || []),
        ...(other.common_regimens || []),
      ]),
      is_on_zvz: Boolean(preferred.is_on_zvz || other.is_on_zvz),
    };
  }

  return output;
}
