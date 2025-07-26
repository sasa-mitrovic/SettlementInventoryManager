import { useEffect, useState } from 'react';
import { useSettlement } from '../contexts/SettlementContext_simple';
import { supabaseClient } from '../supabase/supabaseClient';

export interface SettlementCraftingOrderCounts {
  open: number;
  in_progress: number;
  completed: number;
  total: number;
}

export function useSettlementCraftingOrderCounts() {
  const { currentSettlement } = useSettlement();
  const [counts, setCounts] = useState<SettlementCraftingOrderCounts>({
    open: 0,
    in_progress: 0,
    completed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      if (!currentSettlement?.entityId) {
        setCounts({ open: 0, in_progress: 0, completed: 0, total: 0 });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch counts by status for the current settlement
        const { data, error: supabaseError } = await supabaseClient
          .from('crafting_orders')
          .select('status')
          .eq('settlement_id', currentSettlement.entityId);

        if (supabaseError) {
          throw supabaseError;
        }

        const statusCounts = data.reduce(
          (acc, order) => {
            switch (order.status) {
              case 'open':
                acc.open++;
                break;
              case 'in_progress':
                acc.in_progress++;
                break;
              case 'completed':
                acc.completed++;
                break;
            }
            acc.total++;
            return acc;
          },
          { open: 0, in_progress: 0, completed: 0, total: 0 },
        );

        setCounts(statusCounts);
      } catch (err) {
        console.error('Failed to fetch settlement crafting order counts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch counts');
        setCounts({ open: 0, in_progress: 0, completed: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [currentSettlement?.entityId]);

  return { counts, loading, error, settlement: currentSettlement };
}
