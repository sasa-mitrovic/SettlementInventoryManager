import { useEffect, useState, useCallback } from 'react';
import { useSettlement } from '../contexts/SettlementContext_simple';
import { supabaseClient } from '../supabase/supabaseClient';
import { settlementInventoryService } from '../services/settlementInventoryService';

export interface SettlementInventoryItem {
  id: string;
  item_name: string;
  tier: number | null;
  rarity: string | null;
  quantity: number;
  container_name: string | null;
  icon_url: string | null;
  location: string;
  icon: string | null;
  building_id: string;
  building_name: string;
  building_nickname: string | null;
  building_type: number;
  item_id: number;
  item_type: string;
  slot_index: number;
  settlement_id?: string;
  created_at: string;
  updated_at: string;
  timestamp?: string;
}

interface UseSettlementInventoryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useSettlementInventory(
  options: UseSettlementInventoryOptions = {},
) {
  const { enabled = true, refetchInterval } = options;
  const { currentSettlement } = useSettlement();
  const [data, setData] = useState<SettlementInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async (settlementId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        '[useSettlementInventory] Fetching inventory for settlement:',
        settlementId,
      );

      // First try to get fresh data from the Bitjita API through proxy
      let inventoryData: SettlementInventoryItem[] = [];

      try {
        inventoryData =
          await settlementInventoryService.fetchSettlementInventory(
            settlementId,
          );
        console.log(
          '[useSettlementInventory] Got',
          inventoryData.length,
          'items from proxy',
        );
      } catch (proxyError) {
        console.warn(
          '[useSettlementInventory] Proxy failed, falling back to database:',
          proxyError,
        );

        // Fallback to database if proxy fails
        const { data: dbData, error: inventoryError } = await supabaseClient
          .from('settlement_inventory')
          .select('*')
          .eq('settlement_id', settlementId)
          .order('location', { ascending: true })
          .order('item_name', { ascending: true });

        if (inventoryError) {
          throw inventoryError;
        }

        inventoryData = dbData || [];
        console.log(
          '[useSettlementInventory] Got',
          inventoryData.length,
          'items from database fallback',
        );
      }

      setData(inventoryData);
    } catch (err) {
      console.error('Failed to fetch settlement inventory:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch inventory',
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled || !currentSettlement?.entityId) {
      setData([]);
      setLoading(false);
      return;
    }

    fetchInventory(currentSettlement.entityId);

    if (refetchInterval) {
      const interval = setInterval(() => {
        if (currentSettlement?.entityId) {
          fetchInventory(currentSettlement.entityId);
        }
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [currentSettlement?.entityId, enabled, refetchInterval]);

  const refetch = useCallback(() => {
    if (currentSettlement?.entityId) {
      fetchInventory(currentSettlement.entityId);
    }
  }, [currentSettlement?.entityId]);

  return {
    data,
    loading,
    error,
    refetch,
    settlement: currentSettlement,
  };
}
