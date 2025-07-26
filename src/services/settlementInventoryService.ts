// Settlement Inventory Service - Fetches inventory data through proxy
import { SettlementInventoryItem } from '../hooks/useSettlementInventory';
import {
  SettlementInventory,
  Building,
  Items,
  Cargo,
} from '../types/settlementInventory';

export interface BitjitaInventoryItem {
  id: string;
  item_name: string;
  tier?: number;
  rarity?: string;
  quantity: number;
  container_name?: string;
  icon_url?: string;
  location: string;
  icon?: string;
  building_id: string;
  building_name: string;
  building_nickname?: string;
  building_type: number;
  item_id: number;
  item_type: string;
  slot_index: number;
}

class SettlementInventoryService {
  private cache = new Map<
    string,
    { data: SettlementInventoryItem[]; timestamp: number }
  >();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchSettlementInventory(
    settlementId: string,
  ): Promise<SettlementInventoryItem[]> {
    console.log(
      '[SettlementInventoryService] Fetching inventory for settlement:',
      settlementId,
    );

    // Check cache first
    const cacheKey = `settlement_${settlementId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(
        '[SettlementInventoryService] Returning cached data:',
        cached.data.length,
        'items',
      );
      return cached.data;
    }

    try {
      const proxyUrl = `/api/bitjita-proxy?endpoint=claims/${settlementId}/inventories&format=raw`;
      console.log(
        '[SettlementInventoryService] Fetching from proxy:',
        proxyUrl,
      );

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch settlement inventory: ${response.status} ${response.statusText}`,
        );
      }

      const data: SettlementInventory = await response.json();
      console.log('[SettlementInventoryService] Raw API response:', data);

      // Validate the response structure
      if (!data || !data.buildings) {
        console.warn(
          '[SettlementInventoryService] Missing buildings in response:',
          data,
        );
        return [];
      }

      const buildings = data.buildings || [];
      const items = data.items || [];
      const cargos = data.cargos || [];

      console.log(
        '[SettlementInventoryService] Processing:',
        buildings.length,
        'buildings,',
        items.length,
        'item definitions,',
        cargos.length,
        'cargo definitions',
      );

      // Create lookup maps for item and cargo definitions
      const itemMap = new Map<number, Items>();
      items.forEach((item) => {
        itemMap.set(item.id, item);
      });

      const cargoMap = new Map<number, Cargo>();
      cargos.forEach((cargo) => {
        cargoMap.set(cargo.id, cargo);
      });

      // Transform buildings and their inventory contents to flat item list
      const transformedItems: SettlementInventoryItem[] = [];

      buildings.forEach((building: Building) => {
        building.inventory.forEach((inventorySlot, slotIndex) => {
          const contents = inventorySlot.contents;
          if (contents && contents.quantity > 0) {
            // Try to find item definition in both items and cargos
            const itemDef =
              itemMap.get(contents.item_id) || cargoMap.get(contents.item_id);

            const containerName =
              building.buildingNickname || building.buildingName;

            transformedItems.push({
              id: `${building.entityId}_${slotIndex}`,
              item_name: itemDef?.name || `Unknown Item (${contents.item_id})`,
              tier: itemDef?.tier || null,
              rarity: itemDef?.rarityStr || null,
              quantity: contents.quantity,
              container_name: containerName,
              icon_url: itemDef?.iconAssetName || null,
              location: containerName,
              icon: itemDef?.iconAssetName || null,
              building_id: building.entityId,
              building_name: building.buildingName,
              building_nickname: building.buildingNickname,
              building_type: building.buildingDescriptionId,
              item_id: contents.item_id,
              item_type: contents.item_type,
              slot_index: slotIndex,
              settlement_id: settlementId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              timestamp: new Date().toISOString(),
            });
          }
        });
      });
      // Cache the result
      this.cache.set(cacheKey, {
        data: transformedItems,
        timestamp: Date.now(),
      });

      console.log(
        '[SettlementInventoryService] Cached and returning:',
        transformedItems.length,
        'items',
      );
      return transformedItems;
    } catch (error) {
      console.error(
        '[SettlementInventoryService] Error fetching settlement inventory:',
        error,
      );
      throw error;
    }
  }

  // Clear cache for a specific settlement or all settlements
  clearCache(settlementId?: string) {
    if (settlementId) {
      this.cache.delete(`settlement_${settlementId}`);
      console.log(
        '[SettlementInventoryService] Cleared cache for settlement:',
        settlementId,
      );
    } else {
      this.cache.clear();
      console.log('[SettlementInventoryService] Cleared all cache');
    }
  }

  // Trigger scraping for a specific settlement
  async triggerScrape(
    settlementId: string,
    userId: string,
    force: boolean = false,
  ): Promise<{ success: boolean; message: string; itemCount?: number }> {
    try {
      console.log(
        '[SettlementInventoryService] Triggering scrape for settlement:',
        settlementId,
      );

      const response = await fetch('/api/scrape-settlement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settlementId,
          userId,
          force,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Clear cache to force fresh data on next fetch
        this.clearCache(settlementId);
        console.log(
          '[SettlementInventoryService] Scrape successful, cleared cache',
        );
      }

      return result;
    } catch (error) {
      console.error(
        '[SettlementInventoryService] Error triggering scrape:',
        error,
      );
      return {
        success: false,
        message:
          'Failed to trigger scrape: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  // Check scrape status for a settlement
  async getScrapeStatus(
    settlementId: string,
    userId: string,
  ): Promise<{
    lastScrape: string | null;
    canScrape: boolean;
    cooldownRemaining: number;
  }> {
    try {
      const response = await fetch(
        `/api/scrape-status/${settlementId}/${userId}`,
      );
      const status = await response.json();
      return status;
    } catch (error) {
      console.error(
        '[SettlementInventoryService] Error getting scrape status:',
        error,
      );
      return {
        lastScrape: null,
        canScrape: true,
        cooldownRemaining: 0,
      };
    }
  }

  // Get cache info for debugging
  getCacheInfo() {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      settlement: key,
      itemCount: value.data.length,
      age: Date.now() - value.timestamp,
      expired: Date.now() - value.timestamp > this.CACHE_DURATION,
    }));

    return {
      totalEntries: this.cache.size,
      entries,
    };
  }
}

// Export singleton instance
export const settlementInventoryService = new SettlementInventoryService();
