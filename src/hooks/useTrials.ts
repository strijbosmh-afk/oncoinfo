import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trial, TrialFilters, Arm, Endpoint, AISummary, SurvivalTimepoint } from '@/types/trial';
import { Json } from '@/integrations/supabase/types';

// Helper to convert database types to application types
function convertEndpoint(dbEndpoint: any): Endpoint {
  return {
    ...dbEndpoint,
    survival_timepoints: dbEndpoint.survival_timepoints as SurvivalTimepoint[] | undefined
  };
}

function convertTrial(dbTrial: any): Trial {
  return dbTrial as Trial;
}

export function useTrials(filters?: TrialFilters) {
  return useQuery({
    queryKey: ['trials', filters],
    queryFn: async () => {
      let query = supabase.from('trials').select('*');
      
      if (filters?.disease_area?.length) {
        query = query.in('disease_area', filters.disease_area);
      }
      if (filters?.setting?.length) {
        query = query.in('setting', filters.setting);
      }
      if (filters?.phase?.length) {
        query = query.in('phase', filters.phase);
      }
      if (filters?.intervention_class?.length) {
        query = query.overlaps('intervention_classes', filters.intervention_class);
      }
      if (filters?.biomarker?.length) {
        query = query.overlaps('biomarkers', filters.biomarker);
      }
      if (filters?.publication_year?.length) {
        query = query.in('publication_year', filters.publication_year);
      }
      if (filters?.search) {
        query = query.or(`acronym.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('publication_year', { ascending: false });
      if (error) throw error;
      return (data || []).map(convertTrial);
    }
  });
}

export function useTrial(id: string) {
  return useQuery({
    queryKey: ['trial', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trials')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return convertTrial(data);
    },
    enabled: !!id
  });
}

export function useTrialArms(trialId: string) {
  return useQuery({
    queryKey: ['arms', trialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arms')
        .select('*')
        .eq('trial_id', trialId);
      if (error) throw error;
      return data as Arm[];
    },
    enabled: !!trialId
  });
}

export function useTrialEndpoints(trialId: string) {
  return useQuery({
    queryKey: ['endpoints', trialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('endpoints')
        .select('*')
        .eq('trial_id', trialId);
      if (error) throw error;
      return (data || []).map(convertEndpoint);
    },
    enabled: !!trialId
  });
}

export function useTrialAISummaries(trialId: string) {
  return useQuery({
    queryKey: ['ai_summaries', trialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('trial_id', trialId)
        .eq('is_current', true);
      if (error) throw error;
      return data as unknown as AISummary[];
    },
    enabled: !!trialId
  });
}

export function useTrialCounts() {
  return useQuery({
    queryKey: ['trial-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trials')
        .select('disease_area');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(trial => {
        counts[trial.disease_area] = (counts[trial.disease_area] || 0) + 1;
      });
      return counts;
    }
  });
}

export function useCreateTrial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trial: Partial<Trial>) => {
      const dbTrial = {
        acronym: trial.acronym!,
        title: trial.title!,
        disease_area: trial.disease_area!,
        setting: trial.setting,
        line_of_therapy: trial.line_of_therapy,
        phase: trial.phase,
        design_type: trial.design_type,
        randomization: trial.randomization,
        blinding: trial.blinding,
        sample_size: trial.sample_size,
        primary_endpoint: trial.primary_endpoint,
        secondary_endpoints: trial.secondary_endpoints,
        intervention_classes: trial.intervention_classes,
        drugs: trial.drugs,
        biomarkers: trial.biomarkers,
        inclusion_criteria: trial.inclusion_criteria as unknown as Json,
        exclusion_criteria: trial.exclusion_criteria as unknown as Json,
        results_summary: trial.results_summary as unknown as Json,
        safety_highlights: trial.safety_highlights,
        pubmed_id: trial.pubmed_id,
        doi: trial.doi,
        journal: trial.journal,
        publication_year: trial.publication_year,
        authors: trial.authors,
        abstract: trial.abstract,
        citation: trial.citation,
        original_km_plot_url: trial.original_km_plot_url,
        is_open_access: trial.is_open_access,
      };
      
      const { data, error } = await supabase
        .from('trials')
        .insert(dbTrial)
        .select()
        .single();
      if (error) throw error;
      return convertTrial(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['trial-counts'] });
    }
  });
}

export function useUpdateTrial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Trial> & { id: string }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'inclusion_criteria' || key === 'exclusion_criteria' || key === 'results_summary') {
          dbUpdates[key] = value as unknown as Json;
        } else {
          dbUpdates[key] = value;
        }
      });
      
      const { data, error } = await supabase
        .from('trials')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return convertTrial(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['trial', data.id] });
    }
  });
}

export function useDeleteTrial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['trial-counts'] });
    }
  });
}