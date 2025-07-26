import { useEffect, useState } from 'react';
import { useSettlement } from '../contexts/SettlementContext';
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
  placed_by_name?: string;
  claimed_by_name?: string;
  completed_by_name?: string;
  placed_by_profile?: {
    in_game_name?: string;
    email: string;
  } | null;
  claimed_by_profile?: {
    in_game_name?: string;
    email: string;
  } | null;
  completed_by_profile?: {
    in_game_name?: string;
    email: string;
  } | null;
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

      // Use the RPC function but filter by settlement_id
      // Force a fresh call by adding a timestamp parameter (ignored by function)
      const { data: ordersData, error: ordersError } = await supabaseClient.rpc(
        'get_crafting_orders_with_names',
        {}, // Empty params, but this forces a fresh call
      );

      if (ordersError) {
        console.error('❌ [CraftingOrders] RPC error:', ordersError);
        throw ordersError;
      }

      console.log(
        '✅ [CraftingOrders] Total orders from RPC:',
        ordersData?.length || 0,
      );

      // Filter by settlement_id and transform the data
      const settlementSpecificOrders =
        ordersData
          ?.filter((order: any) => {
            return order.settlement_id === settlementId;
          })
          ?.map((order: any) => ({
            ...order,
            // Create profile objects for compatibility
            placed_by_profile: order.placed_by_name
              ? {
                  in_game_name: order.placed_by_name,
                  email: order.placed_by_name,
                }
              : null,
            claimed_by_profile: order.claimed_by_name
              ? {
                  in_game_name: order.claimed_by_name,
                  email: order.claimed_by_name,
                }
              : null,
            completed_by_profile: order.completed_by_name
              ? {
                  in_game_name: order.completed_by_name,
                  email: order.completed_by_name,
                }
              : null,
          })) || [];

      setData(settlementSpecificOrders);
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
