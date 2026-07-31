import { normalizeDischargeTemplateDiscipline } from './dischargeTemplateClassification';
import { formatDischargeTemplateContent } from './dischargeTemplateFormat';

export interface MergeDocument {
  id: string;
}

export interface MergeTemplate {
  id: string;
  document_id: string;
  discipline: string;
  title: string;
  content: string;
  display_order: number;
}

export function mergeDischargeTemplates<TDocument extends MergeDocument>(
  documents: TDocument[],
  storedTemplates: MergeTemplate[],
) {
  const documentRank = new Map(documents.map((document, index) => [document.id, index]));
  const seenTitles = new Set<string>();

  return [...storedTemplates]
    .sort((a, b) => {
      const rankDifference = (documentRank.get(a.document_id) ?? Number.MAX_SAFE_INTEGER)
        - (documentRank.get(b.document_id) ?? Number.MAX_SAFE_INTEGER);
      return rankDifference || a.display_order - b.display_order;
    })
    .filter((template) => {
      const titleKey = template.title.trim().toLocaleLowerCase();
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
    })
    .map((template) => {
      const discipline = normalizeDischargeTemplateDiscipline(template);
      return {
        id: template.id,
        discipline,
        title: template.title,
        content: formatDischargeTemplateContent({ ...template, discipline }),
        display_order: template.display_order,
      };
    });
}
