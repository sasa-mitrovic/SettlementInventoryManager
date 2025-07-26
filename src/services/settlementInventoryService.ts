// Settlement Inventory Service - Fetches inventory data through proxy
import { SettlementInventoryItem } from '../hooks/useSettlementInventory';

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
  private cache = new Map<string, { data: SettlementInventoryItem[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchSettlementInventory(settlementId: string): Promise<SettlementInventoryItem[]> {
    console.log('[SettlementInventoryService] Fetching inventory for settlement:', settlementId);

    // Check cache first
    const cacheKey = `settlement_${settlementId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[SettlementInventoryService] Returning cached data:', cached.data.length, 'items');
      return cached.data;
    }

    try {
      const proxyUrl = `/api/bitjita-proxy?endpoint=claims/${settlementId}/inventories&format=raw`;
      console.log('[SettlementInventoryService] Fetching from proxy:', proxyUrl);

      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settlement inventory: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SettlementInventoryService] Raw API response:', data);

      // Handle both direct array and wrapped object responses
      let inventoryItems: BitjitaInventoryItem[] = [];
      if (Array.isArray(data)) {
        inventoryItems = data;
      } else if (data && Array.isArray(data.inventory)) {
        inventoryItems = data.inventory;
      } else if (data && Array.isArray(data.items)) {
        inventoryItems = data.items;
      } else {
        console.warn('[SettlementInventoryService] Unexpected response format:', data);
        return [];
      }

      console.log('[SettlementInventoryService] Parsed inventory items:', inventoryItems.length);

      // Transform to match our interface
      const transformedItems: SettlementInventoryItem[] = inventoryItems.map((item) => ({
        id: item.id,
        item_name: item.item_name,
        tier: item.tier || null,
        rarity: item.rarity ? String(item.rarity) : null, // Ensure rarity is always a string
        quantity: item.quantity,
        container_name: item.container_name || null,
        icon_url: item.icon_url || null,
        location: item.location,
        icon: item.icon || null,
        building_id: item.building_id,
        building_name: item.building_name,
        building_nickname: item.building_nickname || null,
        building_type: item.building_type,
        item_id: item.item_id,
        item_type: item.item_type,
        slot_index: item.slot_index,
        settlement_id: settlementId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      }));

      // Cache the result
      this.cache.set(cacheKey, {
        data: transformedItems,
        timestamp: Date.now(),
      });

      console.log('[SettlementInventoryService] Cached and returning:', transformedItems.length, 'items');
      return transformedItems;

    } catch (error) {
      console.error('[SettlementInventoryService] Error fetching settlement inventory:', error);
      throw error;
    }
  }

  // Clear cache for a specific settlement or all settlements
  clearCache(settlementId?: string) {
    if (settlementId) {
      this.cache.delete(`settlement_${settlementId}`);
      console.log('[SettlementInventoryService] Cleared cache for settlement:', settlementId);
    } else {
      this.cache.clear();
      console.log('[SettlementInventoryService] Cleared all cache');
    }
  }

  // Trigger scraping for a specific settlement
  async triggerScrape(settlementId: string, userId: string, force: boolean = false): Promise<{ success: boolean; message: string; itemCount?: number }> {
    try {
      console.log('[SettlementInventoryService] Triggering scrape for settlement:', settlementId);
      
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
        console.log('[SettlementInventoryService] Scrape successful, cleared cache');
      }

      return result;
    } catch (error) {
      console.error('[SettlementInventoryService] Error triggering scrape:', error);
      return {
        success: false,
        message: 'Failed to trigger scrape: ' + (error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  // Check scrape status for a settlement
  async getScrapeStatus(settlementId: string, userId: string): Promise<{ lastScrape: string | null; canScrape: boolean; cooldownRemaining: number }> {
    try {
      const response = await fetch(`/api/scrape-status/${settlementId}/${userId}`);
      const status = await response.json();
      return status;
    } catch (error) {
      console.error('[SettlementInventoryService] Error getting scrape status:', error);
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
