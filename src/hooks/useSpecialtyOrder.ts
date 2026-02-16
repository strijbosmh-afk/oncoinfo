import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_ORDER = ['breast', 'urology', 'gynecology', 'respiratory', 'digestive', 'skin', 'head_neck', 'other'];

export function useSpecialtyOrder() {
  const { user } = useAuth();
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrder(DEFAULT_ORDER);
      setLoaded(true);
      return;
    }
    const fetch = async () => {
      const { data } = await supabase
        .from('user_specialty_order' as any)
        .select('specialty_keys')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data && (data as any).specialty_keys?.length > 0) {
        // Merge: saved order first, then any new keys not yet saved
        const saved = (data as any).specialty_keys as string[];
        const merged = [...saved, ...DEFAULT_ORDER.filter(k => !saved.includes(k))];
        setOrder(merged);
      } else {
        setOrder(DEFAULT_ORDER);
      }
      setLoaded(true);
    };
    fetch();
  }, [user]);

  const saveOrder = useCallback(async (newOrder: string[]) => {
    setOrder(newOrder);
    if (!user) return;
    await supabase
      .from('user_specialty_order' as any)
      .upsert(
        { user_id: user.id, specialty_keys: newOrder, updated_at: new Date().toISOString() } as any,
        { onConflict: 'user_id' }
      );
  }, [user]);

  return { order, saveOrder, loaded };
}
