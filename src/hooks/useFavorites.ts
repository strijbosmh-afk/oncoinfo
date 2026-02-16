import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_favorites' as any)
      .select('drug_id')
      .eq('user_id', user.id);
    setFavorites((data as any[] || []).map((d: any) => d.drug_id));
  }, [user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (drugId: string) => {
    if (!user?.id) return;
    // Optimistic update
    setFavorites(prev => prev.includes(drugId) ? prev : [...prev, drugId]);
    await supabase
      .from('user_favorites' as any)
      .upsert({ user_id: user.id, drug_id: drugId } as any, { onConflict: 'user_id,drug_id' });
    // Re-sync from DB
    await fetchFavorites();
  }, [user?.id, fetchFavorites]);

  const removeFavorite = useCallback(async (drugId: string) => {
    if (!user?.id) return;
    setFavorites(prev => prev.filter(id => id !== drugId));
    await supabase
      .from('user_favorites' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('drug_id', drugId);
    await fetchFavorites();
  }, [user?.id, fetchFavorites]);

  const toggleFavorite = useCallback(async (drugId: string) => {
    // Always check current DB state to avoid stale toggling across devices
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_favorites' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('drug_id', drugId);
    
    if ((data as any[] || []).length > 0) {
      await removeFavorite(drugId);
    } else {
      await addFavorite(drugId);
    }
  }, [user?.id, addFavorite, removeFavorite]);

  const isFavorite = useCallback((drugId: string) => {
    return favorites.includes(drugId);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}
