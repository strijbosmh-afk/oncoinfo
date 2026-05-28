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
      const { data: doc } = await supabase
        .from('discharge_letter_documents' as any)
        .select('id, document_title, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: templates, error } = await supabase
        .from('discharge_letter_templates' as any)
        .select('id, discipline, title, content, display_order')
        .order('discipline', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;

      return {
        document: (doc as unknown as DischargeDocument) || null,
        templates: (templates as unknown as DischargeTemplate[]) || [],
      };
    },
  });
}

export function useDischargeDisciplines(enabled = true) {
  const { data, isLoading } = useDischargeTemplates(enabled);
  const disciplines = data?.templates
    ? Array.from(new Set(data.templates.map(t => t.discipline)))
    : [];
  return { disciplines, isLoading, document: data?.document || null };
}
