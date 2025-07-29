import { useEffect, useState } from 'react';
import { useSettlement } from '../contexts/SettlementContext_simple';
import { supabaseClient } from '../supabase/supabaseClient';

export interface SettlementCraftingOrder {
  id: string;
  created_at: string;
  item_id: string;
  item_name: string;
  item_icon?: string;
  item_tier?: string;
  quantity: number;
  sector?: string;
  status: 'unassigned' | 'assigned' | 'completed';
  placed_by: string;
  claimed_by?: string;
  completed_at?: string;
  completed_by?: string;
  settlement_id: string;
  hexcoin?: number;
  notes?: string;
  // User names from RPC function joins
  placed_by_name?: string | null;
  claimed_by_name?: string | null;
  completed_by_name?: string | null;
}

interface UseSettlementCraftingOrdersOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useSettlementCraftingOrders(
  options: UseSettlementCraftingOrdersOptions = {},
) {
  const { enabled = true, refetchInterval } = options;
  const { currentSettlement } = useSettlement();
  const [data, setData] = useState<SettlementCraftingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCraftingOrders = async (settlementId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        '🔍 [CraftingOrders] Fetching orders for settlement:',
        settlementId,
      );

      // Use RPC function to get crafting orders without profile joins
      const { data: ordersData, error: ordersError } = await supabaseClient.rpc(
        'get_settlement_crafting_orders',
        {
          p_settlement_id: settlementId,
        },
      );

      if (ordersError) {
        console.error('❌ [CraftingOrders] RPC error:', ordersError);
        throw ordersError;
      }

      console.log(
        '✅ [CraftingOrders] Orders fetched for settlement:',
        ordersData?.length || 0,
      );

      // Transform the data to match our interface
      const transformedOrders =
        ordersData?.map((order: SettlementCraftingOrder) => ({
          ...order,
          // Ensure hexcoin and notes are included
          hexcoin: order.hexcoin || 0,
          notes: order.notes || '',
          // Now we get the user names directly from the RPC function
          placed_by_name: order.placed_by_name || null,
          claimed_by_name: order.claimed_by_name || null,
          completed_by_name: order.completed_by_name || null,
        })) || [];

      console.log('Transformed Orders:', transformedOrders);
      setData(transformedOrders);
    } catch (err) {
      console.error('Failed to fetch settlement crafting orders:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch crafting orders',
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    if (currentSettlement?.entityId) {
      fetchCraftingOrders(currentSettlement.entityId);
    }
  };

  useEffect(() => {
    if (!enabled || !currentSettlement?.entityId) {
      setData([]);
      setLoading(false);
      return;
    }

    fetchCraftingOrders(currentSettlement.entityId);

    // Set up refetch interval if specified
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(() => {
        fetchCraftingOrders(currentSettlement.entityId);
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [currentSettlement?.entityId, enabled, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
