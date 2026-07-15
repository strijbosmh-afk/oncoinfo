import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PATIENT_FOLDER_CONTENT_COLUMNS = [
  'id',
  'drug_id',
  'introduction',
  'usage_info',
  'dosing_info',
  'contraindications',
  'side_effects_common',
  'side_effects_serious',
  'tips',
  'self_care_tips',
  'monitoring',
  'created_at',
  'updated_at',
].join(',');

export interface PatientFolderContent {
  id?: string;
  drug_id: string;
  introduction?: string | null;
  usage_info?: string | null;
  dosing_info?: string | null;
  contraindications?: string | null;
  side_effects_common?: string | null;
  side_effects_serious?: string | null;
  tips?: string | null;
  self_care_tips?: string | null;
  monitoring?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function usePatientFolderContent(drugId: string) {
  return useQuery({
    queryKey: ['patient-folder-content', drugId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_folder_content')
        .select(PATIENT_FOLDER_CONTENT_COLUMNS)
        .eq('drug_id', drugId)
        .maybeSingle();

      if (error) throw error;
      return data as PatientFolderContent | null;
    },
    enabled: !!drugId,
  });
}

export function useSavePatientFolderContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: PatientFolderContent) => {
      // Check if content exists
      const { data: existing } = await supabase
        .from('patient_folder_content')
        .select('id')
        .eq('drug_id', content.drug_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('patient_folder_content')
          .update({
            introduction: content.introduction,
            usage_info: content.usage_info,
            dosing_info: content.dosing_info,
            contraindications: content.contraindications,
            side_effects_common: content.side_effects_common,
            side_effects_serious: content.side_effects_serious,
            tips: content.tips,
            self_care_tips: content.self_care_tips,
            monitoring: content.monitoring,
          })
          .eq('drug_id', content.drug_id)
          .select(PATIENT_FOLDER_CONTENT_COLUMNS)
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('patient_folder_content')
          .insert({
            drug_id: content.drug_id,
            introduction: content.introduction,
            usage_info: content.usage_info,
            dosing_info: content.dosing_info,
            contraindications: content.contraindications,
            side_effects_common: content.side_effects_common,
            side_effects_serious: content.side_effects_serious,
            tips: content.tips,
            self_care_tips: content.self_care_tips,
            monitoring: content.monitoring,
          })
          .select(PATIENT_FOLDER_CONTENT_COLUMNS)
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-folder-content', variables.drug_id] });
    },
  });
}

export function useResetPatientFolderContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drugId: string) => {
      const { error } = await supabase
        .from('patient_folder_content')
        .delete()
        .eq('drug_id', drugId);

      if (error) throw error;
    },
    onSuccess: (_, drugId) => {
      queryClient.invalidateQueries({ queryKey: ['patient-folder-content', drugId] });
    },
  });
}
