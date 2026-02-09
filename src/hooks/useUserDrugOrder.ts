import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserDrugOrder {
  drug_id: string;
  display_order: number;
}

export function useUserDrugOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userOrder } = useQuery({
    queryKey: ['user-drug-order', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('user_drug_order')
        .select('drug_id, display_order')
        .eq('user_id', user.id)
        .order('display_order');

      if (error) {
        console.error('Error fetching user drug order:', error);
        return null;
      }
      return data as UserDrugOrder[];
    },
    enabled: !!user,
  });

  const saveOrder = useMutation({
    mutationFn: async (orders: { drug_id: string; display_order: number }[]) => {
      if (!user) throw new Error('Not authenticated');

      // Delete existing order for this user
      await (supabase as any)
        .from('user_drug_order')
        .delete()
        .eq('user_id', user.id);

      // Insert new order
      if (orders.length > 0) {
        const rows = orders.map((o) => ({
          user_id: user.id,
          drug_id: o.drug_id,
          display_order: o.display_order,
        }));

        const { error } = await (supabase as any)
          .from('user_drug_order')
          .insert(rows);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-drug-order', user?.id] });
    },
  });

  // Apply user order to a list of drugs
  const applyUserOrder = <T extends { id: string }>(drugs: T[]): T[] => {
    if (!userOrder || userOrder.length === 0) return drugs;

    const orderMap = new Map(userOrder.map((o) => [o.drug_id, o.display_order]));
    const ordered = [...drugs];

    ordered.sort((a, b) => {
      const orderA = orderMap.get(a.id);
      const orderB = orderMap.get(b.id);

      // If both have user order, sort by that
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      // User-ordered items come first (or keep original position)
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;
      return 0;
    });

    return ordered;
  };

  return {
    userOrder,
    saveOrder,
    applyUserOrder,
    hasCustomOrder: !!userOrder && userOrder.length > 0,
  };
}
