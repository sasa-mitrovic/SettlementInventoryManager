import { supabaseClient } from '../supabase/supabaseClient';
import { notifications } from '@mantine/notifications';

export interface BitjitaItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  rarity?: string;
  tier?: string;
  type?: string;
  icon?: string;
  value?: number;
  // Add other properties as needed based on API response
}

interface CacheData {
  items: BitjitaItem[];
  timestamp: number;
  version: number;
}

class BitjitaItemsCache {
  private static instance: BitjitaItemsCache;
  private cache: CacheData | null = null;
  private loading: boolean = false;
  private loadPromise: Promise<BitjitaItem[]> | null = null;
  private listeners: Set<(items: BitjitaItem[]) => void> = new Set();

  // Cache for 5 minutes (300000ms) - adjust as needed
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  private readonly STORAGE_KEY = 'bitjita_items_cache';
  private readonly VERSION = 1; // Increment when cache structure changes
  private readonly DEBUG = true; // Set to false in production

  private constructor() {
    this.loadFromLocalStorage();
  }

  public static getInstance(): BitjitaItemsCache {
    if (!BitjitaItemsCache.instance) {
      BitjitaItemsCache.instance = new BitjitaItemsCache();
    }
    return BitjitaItemsCache.instance;
  }

  private log(message: string, ...args: any[]): void {
    if (this.DEBUG) {
      console.log(`[BitjitaCache] ${message}`, ...args);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data: CacheData = JSON.parse(stored);

        // Check version compatibility
        if (data.version === this.VERSION && this.isValid(data)) {
          this.cache = data;
          this.log(`Loaded ${data.items.length} items from localStorage cache`);
        } else {
          this.log('Cache version mismatch or invalid, will refresh');
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveToLocalStorage(): void {
    if (this.cache) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
        this.log(
          `Saved ${this.cache.items.length} items to localStorage cache`,
        );
      } catch (error) {
        console.warn('Failed to save cache to localStorage:', error);
      }
    }
  }

  private isValid(cache: CacheData): boolean {
    const now = Date.now();
    const age = now - cache.timestamp;
    return age < this.CACHE_DURATION && Array.isArray(cache.items);
  }

  private async fetchFromAPI(): Promise<BitjitaItem[]> {
    this.log('Fetching fresh data from Bitjita API...');

    // Use Supabase database function to fetch from Bitjita API (avoids CORS)
    const { data, error } = await supabaseClient.rpc('fetch_bitjita_items');

    if (error) {
      throw new Error(
        error.message || 'Failed to call fetch_bitjita_items function',
      );
    }

    // Check if the function returned an error
    if (data?.error) {
      throw new Error(data.message || 'API function returned an error');
    }

    this.log('Fresh API Response received:', data);

    // Handle different response structures
    let itemsArray = data;

    // If data has a 'data' or 'items' property, use that
    if (data?.data && Array.isArray(data.data)) {
      itemsArray = data.data;
    } else if (data?.items && Array.isArray(data.items)) {
      itemsArray = data.items;
    }

    // Ensure we have an array
    if (!Array.isArray(itemsArray)) {
      console.error('Unexpected API response structure:', data);
      throw new Error(
        `API response is not an array. Got: ${typeof itemsArray}. Structure: ${JSON.stringify(data).substring(0, 200)}...`,
      );
    }

    // Convert the items to have string IDs for Mantine Select compatibility
    const itemsWithStringIds = itemsArray.map((item: any) => ({
      ...item,
      id: item.id?.toString() || item.item_id?.toString() || 'unknown',
    }));

    // Filter out items that end with "Output"
    const filteredItems = itemsWithStringIds.filter(
      (item: any) => !item.name?.endsWith('Output'),
    );

    return filteredItems;
  }

  public async getItems(forceRefresh: boolean = false): Promise<BitjitaItem[]> {
    // If we have a valid cache and not forcing refresh, return it
    if (!forceRefresh && this.cache && this.isValid(this.cache)) {
      this.log(`Returning ${this.cache.items.length} items from cache`);
      return this.cache.items;
    }

    // If already loading, return the existing promise
    if (this.loading && this.loadPromise) {
      this.log('Already loading, waiting for existing promise...');
      return this.loadPromise;
    }

    // Start loading
    this.loading = true;
    this.loadPromise = this.fetchFromAPI()
      .then((items) => {
        // Update cache
        this.cache = {
          items,
          timestamp: Date.now(),
          version: this.VERSION,
        };

        // Save to localStorage
        this.saveToLocalStorage();

        // Notify listeners
        this.notifyListeners(items);

        this.log(`Successfully cached ${items.length} items`);
        return items;
      })
      .catch((error) => {
        console.error('Failed to fetch items from API:', error);

        // If we have stale cache, return it as fallback
        if (this.cache && this.cache.items.length > 0) {
          this.log('Using stale cache as fallback');
          notifications.show({
            title: 'Using Cached Data',
            message: 'Failed to fetch fresh data, using cached items.',
            color: 'yellow',
          });
          return this.cache.items;
        }

        // No cache available, throw error
        notifications.show({
          title: 'Error',
          message: `Failed to load items: ${error instanceof Error ? error.message : 'Unknown error'}`,
          color: 'red',
        });
        throw error;
      })
      .finally(() => {
        this.loading = false;
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public getCachedItems(): BitjitaItem[] | null {
    return this.cache?.items || null;
  }

  public getCacheAge(): number | null {
    return this.cache ? Date.now() - this.cache.timestamp : null;
  }

  public isCacheValid(): boolean {
    return this.cache ? this.isValid(this.cache) : false;
  }

  public invalidateCache(): void {
    this.cache = null;
    localStorage.removeItem(this.STORAGE_KEY);
    this.log('Cache invalidated');
  }

  // Background refresh - call this periodically or on app start
  public async refreshInBackground(): Promise<void> {
    try {
      await this.getItems(true);
    } catch (error) {
      console.warn('Background refresh failed:', error);
      // Don't show notifications for background failures
    }
  }

  // Listener pattern for reactive updates
  public subscribe(listener: (items: BitjitaItem[]) => void): () => void {
    this.listeners.add(listener);

    // If we have cached items, immediately call the listener
    if (this.cache?.items) {
      listener(this.cache.items);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(items: BitjitaItem[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(items);
      } catch (error) {
        console.error('Error in cache listener:', error);
      }
    });
  }

  // Preload items (call on app startup)
  public async preload(): Promise<void> {
    if (!this.cache || !this.isValid(this.cache)) {
      try {
        await this.getItems();
        this.log('Preload completed successfully');
      } catch (error) {
        console.warn('Preload failed:', error);
        // Don't throw - this is just preloading
      }
    } else {
      this.log('Cache already valid, skipping preload');
    }
  }
}

// Export singleton instance
export const bitjitaItemsCache = BitjitaItemsCache.getInstance();

// Export hook for React components
export const useBitjitaItems = () => {
  const [items, setItems] = React.useState<BitjitaItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const cachedItems = bitjitaItemsCache.getCachedItems();

        if (cachedItems) {
          setItems(cachedItems);
        }

        const freshItems = await bitjitaItemsCache.getItems();
        setItems(freshItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadItems();

    // Subscribe to cache updates
    const unsubscribe = bitjitaItemsCache.subscribe((newItems) => {
      setItems(newItems);
    });

    return unsubscribe;
  }, []);

  const refreshItems = React.useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const freshItems = await bitjitaItemsCache.getItems(force);
      setItems(freshItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    loading: loading || bitjitaItemsCache.isLoading(),
    error,
    refreshItems,
    cacheAge: bitjitaItemsCache.getCacheAge(),
    isCacheValid: bitjitaItemsCache.isCacheValid(),
  };
};

import React from 'react';
