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
    const { error } = await supabase
      .from('user_favorites' as any)
      .insert({ user_id: user.id, drug_id: drugId } as any);
    if (!error) {
      setFavorites(prev => [...prev, drugId]);
    }
  }, [user?.id]);

  const removeFavorite = useCallback(async (drugId: string) => {
    if (!user?.id) return;
    await supabase
      .from('user_favorites' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('drug_id', drugId);
    setFavorites(prev => prev.filter(id => id !== drugId));
  }, [user?.id]);

  const toggleFavorite = useCallback(async (drugId: string) => {
    if (favorites.includes(drugId)) {
      await removeFavorite(drugId);
    } else {
      await addFavorite(drugId);
    }
  }, [favorites, addFavorite, removeFavorite]);

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
