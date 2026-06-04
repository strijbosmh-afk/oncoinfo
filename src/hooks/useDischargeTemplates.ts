import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DischargeTemplate {
  id: string;
  discipline: string;
  title: string;
  content: string;
  display_order: number;
}

export interface DischargeDocument {
  id: string;
  document_title: string;
  uploaded_at: string;
}

export function useDischargeTemplates(enabled = true) {
  return useQuery({
    queryKey: ['discharge-templates'],
    enabled,
    queryFn: async () => {
      const { data: docs } = await supabase
        .from('discharge_letter_documents' as any)
        .select('id, document_title, uploaded_at')
        .order('uploaded_at', { ascending: false });

      const documents = (docs as unknown as DischargeDocument[]) || [];
      const current = documents[0] || null;
      const previousDocuments = documents.slice(1);

      let templates: DischargeTemplate[] = [];
      if (current) {
        const { data, error } = await supabase
          .from('discharge_letter_templates' as any)
          .select('id, discipline, title, content, display_order')
          .eq('document_id', current.id)
          .order('discipline', { ascending: true })
          .order('display_order', { ascending: true });

        if (error) throw error;
        templates = (data as unknown as DischargeTemplate[]) || [];
      }

      return {
        document: current,
        previousDocuments,
        templates,
      };
    },
  });
}

// Explicit ordering: prostaat/testis/blaas first, indicatie-overstijgende last.
const TOP_DISCIPLINES = ['prostaat', 'testis', 'blaas'];

function disciplineRank(name: string): number {
  const n = name.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
  const topIdx = TOP_DISCIPLINES.findIndex(k => n.includes(k));
  if (topIdx !== -1) return topIdx; // 0,1,2
  if (n.includes('indicatie-overstijgende') || n.includes('indicatie overstijgende')) return 1000;
  return 100; // middle group, keeps alphabetical via stable sort
}

export function useDischargeDisciplines(enabled = true) {
  const { data, isLoading } = useDischargeTemplates(enabled);
  const disciplines = data?.templates
    ? Array.from(new Set(data.templates.map(t => t.discipline))).sort(
        (a, b) => disciplineRank(a) - disciplineRank(b)
      )
    : [];
  return { disciplines, isLoading, document: data?.document || null };
}
