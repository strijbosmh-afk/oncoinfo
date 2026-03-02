import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import i18n from '@/i18n';

const MAX_MOST_USED = 8;

interface MostUsedEntry {
  drug_id: string;
  display_order: number;
}

async function fetchMostUsedFromDB(userId: string): Promise<MostUsedEntry[]> {
  const { data } = await supabase
    .from('user_most_used' as any)
    .select('drug_id, display_order')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });
  return (data as any[]) || [];
}

export function useMostUsed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: mostUsed = [] } = useQuery({
    queryKey: ['most-used', user?.id],
    queryFn: () => fetchMostUsedFromDB(user!.id),
    enabled: !!user?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async (drugId: string) => {
      const alreadyExists = mostUsed.some(m => m.drug_id === drugId);

      if (alreadyExists) {
        await supabase
          .from('user_most_used' as any)
          .delete()
          .eq('user_id', user!.id)
          .eq('drug_id', drugId);
        return { action: 'removed', drugId };
      } else {
        if (mostUsed.length >= MAX_MOST_USED) {
          toast.error(i18n.t('mostUsed.maxReached', { max: MAX_MOST_USED }));
          throw new Error('max_reached');
        }
        // Delete any stale row first, then insert
        await supabase
          .from('user_most_used' as any)
          .delete()
          .eq('user_id', user!.id)
          .eq('drug_id', drugId);
        const nextOrder = mostUsed.length > 0
          ? Math.max(...mostUsed.map(m => m.display_order)) + 1
          : 0;
        await supabase
          .from('user_most_used' as any)
          .insert({ user_id: user!.id, drug_id: drugId, display_order: nextOrder } as any);
        return { action: 'added', drugId, display_order: nextOrder };
      }
    },
    onMutate: async (drugId) => {
      await queryClient.cancelQueries({ queryKey: ['most-used', user?.id] });
      const previous = queryClient.getQueryData<MostUsedEntry[]>(['most-used', user?.id]) ?? [];
      return { previous };
    },
    onError: (_err, _drugId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['most-used', user?.id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['most-used', user?.id] });
    },
  });

  const isMostUsed = (drugId: string) => mostUsed.some(m => m.drug_id === drugId);
  const toggleMostUsed = (drugId: string) => toggleMutation.mutate(drugId);

  return {
    mostUsed,
    isMostUsed,
    toggleMostUsed,
    isLoading: toggleMutation.isPending,
    fetchMostUsed: () => queryClient.invalidateQueries({ queryKey: ['most-used', user?.id] }),
  };
}
