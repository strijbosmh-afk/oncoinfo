import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Drug, DrugFilters } from '@/types/drug';

function convertDrug(dbDrug: any): Drug {
  return {
    id: dbDrug.id,
    generic_name: dbDrug.generic_name,
    brand_names: dbDrug.brand_names || [],
    drug_class: dbDrug.drug_class,
    mechanism_of_action: dbDrug.mechanism_of_action,
    disease_areas: dbDrug.disease_areas || [],
    approved_indications: dbDrug.approved_indications,
    common_regimens: dbDrug.common_regimens,
    dosing_info: dbDrug.dosing_info,
    administration_route: dbDrug.administration_route,
    cycle_length_days: dbDrug.cycle_length_days,
    side_effects: dbDrug.side_effects,
    contraindications: dbDrug.contraindications,
    drug_interactions: dbDrug.drug_interactions,
    monitoring_requirements: dbDrug.monitoring_requirements,
    patient_counseling_points: dbDrug.patient_counseling_points,
    ema_approval_date: dbDrug.ema_approval_date,
    fda_approval_date: dbDrug.fda_approval_date,
    is_on_zvz: dbDrug.is_on_zvz,
    unit_price: dbDrug.unit_price,
    price_unit: dbDrug.price_unit,
    reference_links: dbDrug.reference_links,
    created_at: dbDrug.created_at,
    updated_at: dbDrug.updated_at,
  };
}

export function useDrugs(filters?: DrugFilters) {
  return useQuery({
    queryKey: ['drugs', filters],
    queryFn: async () => {
      let query = supabase.from('drugs').select('*');

      if (filters?.drug_class?.length) {
        // Include Combinatietherapie when Chemotherapie is selected
        const classesToFilter = [...filters.drug_class];
        if (classesToFilter.includes('Chemotherapie') && !classesToFilter.includes('Combinatietherapie')) {
          classesToFilter.push('Combinatietherapie');
        }
        query = query.in('drug_class', classesToFilter);
      }

      if (filters?.disease_area?.length) {
        query = query.overlaps('disease_areas', filters.disease_area);
      }

      if (filters?.administration_route?.length) {
        query = query.in('administration_route', filters.administration_route);
      }

      query = query.order('display_order').order('generic_name');

      const { data, error } = await query;

      if (error) throw error;
      
      let results = (data || []).map(convertDrug);
      
      // Client-side search filtering on generic_name, brand_names, and drug schema names
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(drug => 
          drug.generic_name.toLowerCase().includes(searchLower) ||
          drug.brand_names.some(bn => bn.toLowerCase().includes(searchLower)) ||
          (drug.common_regimens && drug.common_regimens.some(r => r.toLowerCase().includes(searchLower)))
        );
      }
      
      return results;
    },
  });
}

export function useDrug(id: string) {
  return useQuery({
    queryKey: ['drug', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return convertDrug(data);
    },
    enabled: !!id,
  });
}

export function useCreateDrug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drug: Omit<Drug, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('drugs')
        .insert(drug as any)
        .select()
        .single();

      if (error) throw error;
      return convertDrug(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
    },
  });
}

export function useUpdateDrug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...drug }: Partial<Drug> & { id: string }) => {
      const { data, error } = await supabase
        .from('drugs')
        .update(drug as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return convertDrug(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      queryClient.invalidateQueries({ queryKey: ['drug', variables.id] });
    },
  });
}

export function useDeleteDrug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drugs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
    },
  });
}

export function useDrugClasses() {
  return useQuery({
    queryKey: ['drug-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('drug_class');

      if (error) throw error;

      const classes = [...new Set(data.map(d => d.drug_class))];
      return classes.sort();
    },
  });
}
