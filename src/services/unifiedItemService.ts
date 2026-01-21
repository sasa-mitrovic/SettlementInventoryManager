/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { notifications } from '@mantine/notifications';
import { STATIC_CARGO_DATA } from './staticCargoData';

// Unified interface for both items and cargos
export interface UnifiedItem {
  id: string;
  name: string;
  description: string;
  tier: number | string;
  rarity: string;
  rarityStr: string;
  iconAssetName: string;
  category: string;
  type: 'item' | 'cargo';
  // Additional fields for better compatibility
  value?: number;
  tag?: string;
  volume?: number;
}

// Raw API response interfaces
interface RawBitjitaItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  rarity?: string;
  rarityStr?: string;
  tier?: string;
  type?: string;
  icon?: string;
  iconAssetName?: string;
  value?: number;
}

interface RawBitjitaCargo {
  id: number;
  name: string;
  description: string;
  volume: number;
  tier: number;
  tag: string;
  rarity: number;
  rarityStr: string;
  iconAssetName: string;
  modelAssetName: string;
  carriedModelAssetName: string;
  pickUpTime: number;
  placeTime: number;
  movementModifier: number;
  blocksPath: boolean;
  despawnTime: number;
  notPickupable: boolean;
  sellOrders: string;
  buyOrders: string;
  totalOrders: string;
  createdAt: string;
  updatedAt: string;
}

interface CacheData {
  items: UnifiedItem[];
  timestamp: number;
  version: number;
}

class UnifiedItemService {
  private static instance: UnifiedItemService;
  private cache: CacheData | null = null;
  private loading: boolean = false;
  private subscribers: Set<() => void> = new Set();

  private constructor() {
    this.loadFromLocalStorage();
  }

  public static getInstance(): UnifiedItemService {
    if (!UnifiedItemService.instance) {
      UnifiedItemService.instance = new UnifiedItemService();
    }
    return UnifiedItemService.instance;
  }

  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem('unified_items_cache');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (this.isCacheValidInternal(parsedCache)) {
          this.cache = parsedCache;
          console.log(
            '[UnifiedItemService] Loaded from localStorage:',
            this.cache?.items.length || 0,
            'items',
          );
        }
      }
    } catch (error) {
      console.error(
        '[UnifiedItemService] Error loading from localStorage:',
        error,
      );
    }
  }

  private saveToLocalStorage(): void {
    try {
      if (this.cache) {
        localStorage.setItem('unified_items_cache', JSON.stringify(this.cache));
        console.log(
          '[UnifiedItemService] Saved to localStorage:',
          this.cache.items.length,
          'items',
        );
      }
    } catch (error) {
      console.error(
        '[UnifiedItemService] Error saving to localStorage:',
        error,
      );
    }
  }

  private isCacheValidInternal(cache: any): boolean {
    if (
      !cache ||
      !cache.items ||
      !Array.isArray(cache.items) ||
      !cache.timestamp
    ) {
      return false;
    }

    // Cache expires after 1 hour
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    const maxAge = 60 * 60 * 1000; // 1 hour

    return cacheAge < maxAge;
  }

  private mapItemToUnified(item: RawBitjitaItem): UnifiedItem {
    return {
      id: String(item.id),
      name: item.name || '',
      description: item.description || '',
      tier: item.tier || 'Unknown',
      rarity: item.rarity || 'common',
      rarityStr: item.rarityStr || item.rarity || 'Common',
      iconAssetName: item.iconAssetName || item.icon || '',
      category: item.category || 'Items',
      type: 'item',
      value: item.value,
    };
  }

  private mapCargoToUnified(cargo: RawBitjitaCargo): UnifiedItem {
    return {
      id: String(cargo.id),
      name: cargo.name || '',
      description: cargo.description || '',
      tier: cargo.tier || 1,
      rarity: cargo.rarityStr || 'common',
      rarityStr: cargo.rarityStr || 'Common',
      iconAssetName: cargo.iconAssetName || '',
      category: 'Cargo',
      type: 'cargo',
      tag: cargo.tag,
      volume: cargo.volume,
    };
  }

  private async fetchItems(): Promise<RawBitjitaItem[]> {
    try {
      console.log('[UnifiedItemService] Fetching items from proxy...');

      // Only use proxy endpoint - no direct API fallback
      const proxyUrl = '/api/bitjita-proxy?endpoint=items';

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      console.log(
        '[UnifiedItemService] Proxy response status:',
        response.status,
      );

      if (!response.ok) {
        throw new Error(
          `Items proxy responded with status: ${response.status}`,
        );
      }

      const data = await response.json();

      // Handle new API format that wraps items in an object
      let itemsArray;
      if (Array.isArray(data)) {
        // Old format: direct array
        itemsArray = data;
      } else if (data && Array.isArray(data.items)) {
        // New format: { items: [...], metrics: {...} }
        itemsArray = data.items;
        console.log(
          '[UnifiedItemService] Using new API format with metrics:',
          data.metrics,
        );
      } else {
        console.error(
          '[UnifiedItemService] Items API returned unexpected format:',
          data,
        );
        throw new Error('Items API returned invalid data format');
      }

      console.log('[UnifiedItemService] Fetched items:', itemsArray.length);
      return itemsArray;
    } catch (error) {
      console.error(
        '[UnifiedItemService] Failed to fetch items from proxy:',
        error,
      );

      // Try to get more details about what went wrong
      if (error instanceof Error) {
        console.error('[UnifiedItemService] Error details:', error.message);
      }

      return [];
    }
  }

  private async fetchCargos(): Promise<RawBitjitaCargo[]> {
    try {
      console.log('[UnifiedItemService] Fetching cargos from proxy...');

      // Only use proxy endpoint - no direct API fallback
      const proxyUrl = '/api/bitjita-proxy?endpoint=cargo';

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      console.log(
        '[UnifiedItemService] Cargo proxy response status:',
        response.status,
      );

      if (!response.ok) {
        throw new Error(
          `Cargo proxy responded with status: ${response.status}`,
        );
      }

      const data = await response.json();

      // Handle new API format that wraps cargo in an object (similar to items)
      let cargoArray;
      if (Array.isArray(data)) {
        // Old format: direct array
        cargoArray = data;
      } else if (data && Array.isArray(data.cargos)) {
        // New format: { cargos: [...] } (plural)
        cargoArray = data.cargos;
        console.log(
          '[UnifiedItemService] Using new cargo API format (cargos):',
          cargoArray.length,
          'items',
        );
      } else if (data && Array.isArray(data.cargo)) {
        // Alternative format: { cargo: [...] } (singular)
        cargoArray = data.cargo;
        console.log(
          '[UnifiedItemService] Using cargo API format (cargo):',
          cargoArray.length,
          'items',
        );
      } else if (data && Array.isArray(data.items)) {
        // Alternative format where cargo might be under 'items'
        cargoArray = data.items;
        console.log('[UnifiedItemService] Using alternative cargo API format (items)');
      } else {
        console.error(
          '[UnifiedItemService] Cargo API returned unexpected format:',
          typeof data,
          data ? Object.keys(data) : 'null',
        );
        throw new Error('Cargo API returned invalid data format');
      }

      console.log('[UnifiedItemService] Fetched cargos:', cargoArray.length);
      return cargoArray;
    } catch (error) {
      console.warn(
        '[UnifiedItemService] Failed to fetch cargos from proxy, using static data:',
        error,
      );
      // Convert static data to RawBitjitaCargo format
      return STATIC_CARGO_DATA.map((staticCargo) => ({
        id: staticCargo.id,
        name: staticCargo.name,
        description: staticCargo.description,
        volume: staticCargo.volume,
        tier: staticCargo.tier,
        tag: staticCargo.tag,
        rarity: staticCargo.rarity,
        rarityStr: staticCargo.rarityStr,
        iconAssetName: staticCargo.iconAssetName,
        modelAssetName: 'Cargo/Package',
        carriedModelAssetName: 'Cargo/Carried/CargoPackSupplies',
        pickUpTime: 0.5,
        placeTime: 0.3,
        movementModifier: 0,
        blocksPath: false,
        despawnTime: 600,
        notPickupable: false,
        sellOrders: '',
        buyOrders: '',
        totalOrders: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  public async fetchAndCacheItems(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    this.notifySubscribers();

    try {
      console.log('[UnifiedItemService] Starting unified fetch...');

      // Fetch both APIs in parallel
      const [rawItems, rawCargos] = await Promise.all([
        this.fetchItems(),
        this.fetchCargos(),
      ]);

      // Map both to unified format
      const unifiedItems: UnifiedItem[] = [];

      // Add items
      rawItems.forEach((item) => {
        unifiedItems.push(this.mapItemToUnified(item));
      });

      // Add cargos
      rawCargos.forEach((cargo) => {
        unifiedItems.push(this.mapCargoToUnified(cargo));
      });

      // Create cache
      this.cache = {
        items: unifiedItems,
        timestamp: Date.now(),
        version: 1,
      };

      console.log(
        `[UnifiedItemService] Successfully unified: ${rawItems.length} items + ${rawCargos.length} cargos = ${unifiedItems.length} total`,
      );

      // Log some sample data
      const sampleItems = unifiedItems
        .filter((item) => item.type === 'item')
        .slice(0, 3);
      const sampleCargos = unifiedItems
        .filter((item) => item.type === 'cargo')
        .slice(0, 3);
      console.log('[UnifiedItemService] Sample items:', sampleItems);
      console.log('[UnifiedItemService] Sample cargos:', sampleCargos);

      // Log leather items specifically
      const leatherItems = unifiedItems.filter((item) =>
        item.name.toLowerCase().includes('leather'),
      );
      console.log(
        `[UnifiedItemService] Found ${leatherItems.length} leather items:`,
        leatherItems.map((item) => ({ name: item.name, type: item.type })),
      );

      this.saveToLocalStorage();

      notifications.show({
        title: 'Data Updated',
        message: `Loaded ${unifiedItems.length} items and cargos from Bitjita API`,
        color: 'green',
      });
    } catch (error) {
      console.error('[UnifiedItemService] Error during fetch:', error);

      // Log more details about the error
      if (error instanceof Error) {
        console.error('[UnifiedItemService] Error name:', error.name);
        console.error('[UnifiedItemService] Error message:', error.message);
        console.error('[UnifiedItemService] Error stack:', error.stack);
      }

      notifications.show({
        title: 'Error',
        message: 'Failed to fetch items and cargos from Bitjita API',
        color: 'red',
      });
    } finally {
      this.loading = false;
      this.notifySubscribers();
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  public getItems(): UnifiedItem[] {
    return this.cache?.items || [];
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public isCacheValid(): boolean {
    return this.cache ? this.isCacheValidInternal(this.cache) : false;
  }

  public clearCache(): void {
    this.cache = null;
    localStorage.removeItem('unified_items_cache');
    this.notifySubscribers();
  }

  public getItemById(id: string): UnifiedItem | undefined {
    return this.getItems().find((item) => item.id === id);
  }

  public searchItems(query: string): UnifiedItem[] {
    const items = this.getItems();
    if (!query.trim()) {
      return items.slice(0, 50); // Return first 50 items if no search
    }

    const searchLower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        (item.category && item.category.toLowerCase().includes(searchLower)) ||
        (item.tag && item.tag.toLowerCase().includes(searchLower)),
    );
  }
}

// React hook for using the unified service
export function useUnifiedItems() {
  const [items, setItems] = React.useState<UnifiedItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isCacheValid, setIsCacheValid] = React.useState(false);

  const service = React.useMemo(() => UnifiedItemService.getInstance(), []);

  const updateState = React.useCallback(() => {
    setItems(service.getItems());
    setLoading(service.isLoading());
    setIsCacheValid(service.isCacheValid());
  }, [service]);

  React.useEffect(() => {
    // Initial state update
    updateState();

    // Subscribe to changes
    const unsubscribe = service.subscribe(updateState);

    // Fetch data if cache is invalid
    if (!service.isCacheValid() && !service.isLoading()) {
      service.fetchAndCacheItems();
    }

    return unsubscribe;
  }, [service, updateState]);

  const refetch = React.useCallback(() => {
    service.fetchAndCacheItems();
  }, [service]);

  const clearCache = React.useCallback(() => {
    service.clearCache();
  }, [service]);

  const searchItems = React.useCallback(
    (query: string) => {
      return service.searchItems(query);
    },
    [service],
  );

  return {
    items,
    loading,
    isCacheValid,
    refetch,
    clearCache,
    searchItems,
  };
}
