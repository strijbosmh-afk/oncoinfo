import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const MAX_MOST_USED = 8;

interface MostUsedEntry {
  template_id: string;
  display_order: number;
}

export function useTemplateMostUsed() {
  const { user } = useAuth();
  const [mostUsed, setMostUsed] = useState<MostUsedEntry[]>([]);

  const fetchMostUsed = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_template_most_used' as any)
      .select('template_id, display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });
    setMostUsed((data as any[]) || []);
  }, [user?.id]);

  useEffect(() => { fetchMostUsed(); }, [fetchMostUsed]);

  const isMostUsed = useCallback((id: string) => mostUsed.some(m => m.template_id === id), [mostUsed]);

  const toggleMostUsed = useCallback(async (templateId: string) => {
    if (!user?.id) return;
    const exists = mostUsed.some(m => m.template_id === templateId);
    if (exists) {
      await supabase.from('user_template_most_used' as any).delete()
        .eq('user_id', user.id).eq('template_id', templateId);
      setMostUsed(prev => prev.filter(m => m.template_id !== templateId));
    } else {
      if (mostUsed.length >= MAX_MOST_USED) {
        toast.error(`Maximum ${MAX_MOST_USED} meest gebruikte sjablonen bereikt`);
        return;
      }
      await supabase.from('user_template_most_used' as any).delete()
        .eq('user_id', user.id).eq('template_id', templateId);
      const nextOrder = mostUsed.length > 0 ? Math.max(...mostUsed.map(m => m.display_order)) + 1 : 0;
      const { error } = await supabase.from('user_template_most_used' as any)
        .insert({ user_id: user.id, template_id: templateId, display_order: nextOrder } as any);
      if (!error) {
        setMostUsed(prev => [...prev.filter(m => m.template_id !== templateId), { template_id: templateId, display_order: nextOrder }]);
      }
    }
  }, [user?.id, mostUsed]);

  return { mostUsed, isMostUsed, toggleMostUsed };
}
