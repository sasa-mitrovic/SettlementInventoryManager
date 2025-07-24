import React from 'react';
import { notifications } from '@mantine/notifications';
import { STATIC_CARGO_DATA } from './staticCargoData';

export interface BitjitaCargo {
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
  cargos: BitjitaCargo[];
  timestamp: number;
  version: number;
}

class BitjitaCargoCache {
  private static instance: BitjitaCargoCache;
  private cache: CacheData | null = null;
  private loading: boolean = false;
  private loadPromise: Promise<BitjitaCargo[]> | null = null;
  private listeners: Set<(cargos: BitjitaCargo[]) => void> = new Set();

  // Cache for 5 minutes (300000ms) - adjust as needed
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  private readonly STORAGE_KEY = 'bitjita_cargo_cache';
  private readonly VERSION = 1; // Increment when cache structure changes

  private constructor() {
    this.loadFromLocalStorage();
  }

  public static getInstance(): BitjitaCargoCache {
    if (!BitjitaCargoCache.instance) {
      BitjitaCargoCache.instance = new BitjitaCargoCache();
    }
    return BitjitaCargoCache.instance;
  }

  private log(message: string, ...args: any[]): void {
    // Uncomment for debugging
    console.log('[BitjitaCargoCache]', message, ...args);
  }

  private getStaticCargoFallback(): BitjitaCargo[] {
    this.log('Converting static cargo data to BitjitaCargo format');
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
      modelAssetName: '',
      carriedModelAssetName: '',
      pickUpTime: 1000,
      placeTime: 1000,
      movementModifier: 1.0,
      blocksPath: false,
      despawnTime: 300000,
      notPickupable: false,
      sellOrders: '0',
      buyOrders: '0',
      totalOrders: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheData;
        if (parsed.version === this.VERSION) {
          this.cache = parsed;
          this.log('Loaded cache from localStorage:', this.cache);
        } else {
          this.log('Cache version mismatch, clearing cache');
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (error) {
      this.log('Error loading cache from localStorage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveToLocalStorage(): void {
    try {
      if (this.cache) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
        this.log('Saved cache to localStorage');
      }
    } catch (error) {
      this.log('Error saving cache to localStorage:', error);
    }
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    const now = Date.now();
    const isValid = now - this.cache.timestamp < this.CACHE_DURATION;
    this.log(`Cache valid: ${isValid}, age: ${now - this.cache.timestamp}ms`);
    return isValid;
  }

  private async fetchFromAPI(): Promise<BitjitaCargo[]> {
    this.log('Fetching fresh cargo data from Bitjita API...');

    try {
      // Direct fetch to Bitjita cargo API
      const response = await fetch('https://bitjita.com/api/cargo', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        // Add no-cors mode if CORS is an issue
        mode: 'cors',
      });

      this.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      this.log('Fresh Cargo API Response received:', data);

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response: not an object');
      }

      const cargosArray = data.cargos;
      if (!Array.isArray(cargosArray)) {
        throw new Error(
          `API response cargos is not an array. Got: ${typeof cargosArray}. Structure: ${JSON.stringify(data).substring(0, 200)}...`,
        );
      }

      this.log(`Successfully fetched ${cargosArray.length} cargos`);

      // Debug: Search for leather items
      const leatherItems = cargosArray.filter((cargo: BitjitaCargo) =>
        cargo.name.toLowerCase().includes('leather'),
      );
      this.log(
        'Leather items found:',
        leatherItems.map((item) => item.name),
      );

      // Update cache
      this.cache = {
        cargos: cargosArray,
        timestamp: Date.now(),
        version: this.VERSION,
      };

      this.saveToLocalStorage();
      this.notifyListeners(cargosArray);

      return cargosArray;
    } catch (error) {
      this.log('Error fetching from API:', error);

      // Log more detailed error information
      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.log(
          'Fetch error - possibly CORS or network issue:',
          error.message,
        );
      }

      throw error;
    }
  }

  private notifyListeners(cargos: BitjitaCargo[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(cargos);
      } catch (error) {
        this.log('Error in listener:', error);
      }
    });
  }

  public async getCargos(): Promise<BitjitaCargo[]> {
    // Return cached data if valid
    if (this.isCacheValid() && this.cache) {
      this.log('Returning cached cargos');
      return this.cache.cargos;
    }

    // If already loading, wait for the existing promise
    if (this.loadPromise) {
      this.log('Already loading, waiting for existing promise');
      return this.loadPromise;
    }

    // Start loading
    this.loading = true;
    this.loadPromise = this.fetchFromAPI()
      .catch((error) => {
        this.log('Failed to fetch fresh data:', error);

        // If we have stale cache, use it as fallback
        if (this.cache) {
          this.log('Using stale cache as fallback');
          notifications.show({
            title: 'Using cached data',
            message: 'Failed to fetch fresh cargo data, using cached cargos.',
            color: 'yellow',
          });
          return this.cache.cargos;
        }

        // No cache available, use static fallback data
        this.log('No cache available, using static fallback cargo data');
        const staticCargos = this.getStaticCargoFallback();

        // Create cache with static data to avoid repeated fallbacks
        this.cache = {
          cargos: staticCargos,
          timestamp: Date.now(),
          version: this.VERSION,
        };
        this.saveToLocalStorage();
        this.notifyListeners(staticCargos);

        // Show informative notification about using fallback data
        if (error instanceof TypeError && error.message.includes('fetch')) {
          notifications.show({
            title: 'Using offline cargo data',
            message:
              'API is not accessible due to CORS policy. Using built-in cargo database.',
            color: 'blue',
          });
        } else {
          notifications.show({
            title: 'Using fallback cargo data',
            message:
              'Could not fetch fresh data from API, using built-in cargo database.',
            color: 'yellow',
          });
        }

        return staticCargos;
      })
      .finally(() => {
        this.loading = false;
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  public subscribe(listener: (cargos: BitjitaCargo[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public getCachedCargos(): BitjitaCargo[] {
    return this.cache?.cargos || [];
  }

  public clearCache(): void {
    this.cache = null;
    localStorage.removeItem(this.STORAGE_KEY);
    this.log('Cache cleared');
  }

  public forceRefresh(): Promise<BitjitaCargo[]> {
    this.clearCache();
    // Also clear localStorage to force fresh fetch
    localStorage.removeItem(this.STORAGE_KEY);
    return this.getCargos();
  }
}

// React hook for using the cargo cache
export function useBitjitaCargos() {
  const [cargos, setCargos] = React.useState<BitjitaCargo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const cache = BitjitaCargoCache.getInstance();

    // Set initial cached data if available
    const cached = cache.getCachedCargos();
    if (cached.length > 0) {
      setCargos(cached);
      setLoading(false);
    }

    // Subscribe to updates
    const unsubscribe = cache.subscribe((newCargos) => {
      setCargos(newCargos);
      setLoading(false);
      setError(null);
    });

    // Load fresh data
    cache
      .getCargos()
      .then((newCargos) => {
        setCargos(newCargos);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load cargos');
      })
      .finally(() => {
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  const refresh = React.useCallback(() => {
    const cache = BitjitaCargoCache.getInstance();
    setLoading(true);
    setError(null);
    return cache.forceRefresh().catch((err) => {
      setError(err.message || 'Failed to refresh cargos');
      throw err;
    });
  }, []);

  return {
    cargos,
    loading,
    error,
    refresh,
  };
}

export default BitjitaCargoCache;
