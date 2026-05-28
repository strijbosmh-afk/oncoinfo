import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useTemplateFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_template_favorites' as any)
      .select('template_id')
      .eq('user_id', user.id);
    setFavorites((data as any[] || []).map((d: any) => d.template_id));
  }, [user?.id]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (templateId: string) => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_template_favorites' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('template_id', templateId);
    if ((data as any[] || []).length > 0) {
      setFavorites(prev => prev.filter(id => id !== templateId));
      await supabase
        .from('user_template_favorites' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('template_id', templateId);
    } else {
      setFavorites(prev => prev.includes(templateId) ? prev : [...prev, templateId]);
      await supabase
        .from('user_template_favorites' as any)
        .insert({ user_id: user.id, template_id: templateId } as any);
    }
    await fetchFavorites();
  }, [user?.id, fetchFavorites]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
