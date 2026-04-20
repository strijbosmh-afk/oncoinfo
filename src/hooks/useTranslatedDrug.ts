import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Drug } from '@/types/drug';

interface TranslatableContent {
  mechanism_of_action?: string;
  approved_indications?: string[];
  common_regimens?: string[];
  dosing_info?: Drug['dosing_info'];
  side_effects?: Drug['side_effects'];
  contraindications?: string[];
  drug_interactions?: string[];
  monitoring_requirements?: string[];
  patient_counseling_points?: string[];
}

export function useTranslatedDrug(drug: Drug | undefined) {
  const { i18n } = useTranslation();
  const language = i18n.language as string;
  // Only translate for non-Dutch languages
  const needsTranslation = !!drug && language !== 'nl';

  const { data: translatedContent, isLoading: isTranslating } = useQuery({
    queryKey: ['drug-translation', 'v2', drug?.id, language],
    queryFn: async (): Promise<TranslatableContent> => {
      if (!drug) return {};

      const content: TranslatableContent = {
        mechanism_of_action: drug.mechanism_of_action,
        approved_indications: drug.approved_indications,
        common_regimens: drug.common_regimens,
        dosing_info: drug.dosing_info,
        side_effects: drug.side_effects,
        contraindications: drug.contraindications,
        drug_interactions: drug.drug_interactions,
        monitoring_requirements: drug.monitoring_requirements,
        patient_counseling_points: drug.patient_counseling_points,
      };

      const { data, error } = await supabase.functions.invoke('translate-drug-content', {
        body: { content, target_language: language },
      });

      if (error) {
        console.error('Translation error:', error);
        return content;
      }

      return data.translated || content;
    },
    enabled: needsTranslation,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  if (!drug) return { translatedDrug: undefined, isTranslating: false };

  if (!needsTranslation) {
    return { translatedDrug: drug, isTranslating: false };
  }

  const translatedDrug: Drug = {
    ...drug,
    ...(translatedContent || {}),
  };

  return { translatedDrug, isTranslating };
}
