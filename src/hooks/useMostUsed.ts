import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import i18n from '@/i18n';

const MAX_MOST_USED = 8;

interface MostUsedEntry {
  drug_id: string;
  display_order: number;
}

export function useMostUsed() {
  const { user } = useAuth();
  const [mostUsed, setMostUsed] = useState<MostUsedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMostUsed = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_most_used' as any)
      .select('drug_id, display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });
    setMostUsed((data as any[]) || []);
  }, [user?.id]);

  useEffect(() => {
    fetchMostUsed();
  }, [fetchMostUsed]);

  const isMostUsed = useCallback((drugId: string) => {
    return mostUsed.some(m => m.drug_id === drugId);
  }, [mostUsed]);

  const toggleMostUsed = useCallback(async (drugId: string) => {
    if (!user?.id) return;

    // Re-check from current state to avoid duplicates
    const alreadyExists = mostUsed.some(m => m.drug_id === drugId);

    if (alreadyExists) {
      // Remove
      await supabase
        .from('user_most_used' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('drug_id', drugId);
      setMostUsed(prev => prev.filter(m => m.drug_id !== drugId));
    } else {
      // Check max
      if (mostUsed.length >= MAX_MOST_USED) {
        toast.error(i18n.t('mostUsed.maxReached', { max: MAX_MOST_USED }));
        return;
      }
      // Delete any existing row first to prevent DB-level duplicates
      await supabase
        .from('user_most_used' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('drug_id', drugId);
      const nextOrder = mostUsed.length > 0 ? Math.max(...mostUsed.map(m => m.display_order)) + 1 : 0;
      const { error } = await supabase
        .from('user_most_used' as any)
        .insert({ user_id: user.id, drug_id: drugId, display_order: nextOrder } as any);
      if (!error) {
        setMostUsed(prev => {
          // Ensure no client-side duplicates
          const filtered = prev.filter(m => m.drug_id !== drugId);
          return [...filtered, { drug_id: drugId, display_order: nextOrder }];
        });
      }
    }
  }, [user?.id, mostUsed]);

  return {
    mostUsed,
    isMostUsed,
    toggleMostUsed,
    isLoading,
    fetchMostUsed,
  };
}
