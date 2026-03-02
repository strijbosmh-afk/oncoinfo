import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

async function fetchFavoritesFromDB(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_favorites' as any)
    .select('drug_id')
    .eq('user_id', userId);
  return (data as any[] || []).map((d: any) => d.drug_id);
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => fetchFavoritesFromDB(user!.id),
    enabled: !!user?.id,
  });

  const addFavorite = useMutation({
    mutationFn: async (drugId: string) => {
      await supabase
        .from('user_favorites' as any)
        .upsert({ user_id: user!.id, drug_id: drugId } as any, { onConflict: 'user_id,drug_id' });
    },
    onMutate: async (drugId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previous = queryClient.getQueryData<string[]>(['favorites', user?.id]) ?? [];
      queryClient.setQueryData(['favorites', user?.id], (old: string[] = []) =>
        old.includes(drugId) ? old : [...old, drugId]
      );
      return { previous };
    },
    onError: (_err, _drugId, context) => {
      queryClient.setQueryData(['favorites', user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (drugId: string) => {
      await supabase
        .from('user_favorites' as any)
        .delete()
        .eq('user_id', user!.id)
        .eq('drug_id', drugId);
    },
    onMutate: async (drugId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previous = queryClient.getQueryData<string[]>(['favorites', user?.id]) ?? [];
      queryClient.setQueryData(['favorites', user?.id], (old: string[] = []) =>
        old.filter(id => id !== drugId)
      );
      return { previous };
    },
    onError: (_err, _drugId, context) => {
      queryClient.setQueryData(['favorites', user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const toggleFavorite = (drugId: string) => {
    if (favorites.includes(drugId)) {
      removeFavorite.mutate(drugId);
    } else {
      addFavorite.mutate(drugId);
    }
  };

  const isFavorite = (drugId: string) => favorites.includes(drugId);

  return {
    favorites,
    addFavorite: (drugId: string) => addFavorite.mutate(drugId),
    removeFavorite: (drugId: string) => removeFavorite.mutate(drugId),
    toggleFavorite,
    isFavorite,
  };
}
