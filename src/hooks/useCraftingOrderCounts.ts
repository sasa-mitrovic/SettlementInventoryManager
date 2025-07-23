import { useState, useEffect } from 'react';
import { supabaseClient } from '../supabase/supabaseClient';

interface OrderCounts {
  unassigned_count: number;
  assigned_count: number;
  completed_count: number;
}

export function useCraftingOrderCounts() {
  const [counts, setCounts] = useState<OrderCounts>({
    unassigned_count: 0,
    assigned_count: 0,
    completed_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseClient.rpc(
        'get_crafting_order_counts',
      );

      if (error) throw error;

      if (data && data.length > 0) {
        setCounts({
          unassigned_count: parseInt(data[0].unassigned_count) || 0,
          assigned_count: parseInt(data[0].assigned_count) || 0,
          completed_count: parseInt(data[0].completed_count) || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch order counts:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch order counts',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  };
}
