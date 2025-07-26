// Bitjita Player API Service
// Handles player search and detailed player information retrieval

export interface BitjitaPlayer {
  entityId: string;
  userId?: string; // Added to track user ID from API if available
  username: string;
  signedIn: boolean;
  timePlayed: number;
  timeSignedIn: number;
  createdAt: string;
  updatedAt: string;
  lastLoginTimestamp: string;
}

export interface BitjitaPlayerSearch {
  players: BitjitaPlayer[];
  total: number;
}

export interface BitjitaEmpireMembership {
  empireEntityId: string;
  empireId?: string; // Added to track empire ID from API if available
  empireName: string;
  rank: number;
  donatedShards: string;
  nobleTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface BitjitaPlayerDetails extends BitjitaPlayer {
  teleportLocationX?: number;
  teleportLocationZ?: number;
  teleportLocationDimension?: number;
  teleportLocationType?: string;
  sessionStartTimestamp?: string;
  signInTimestamp?: string;
  travelerTasksExpiration?: string;
  experienceStacks?: Array<{
    quantity: number;
    skill_id: number;
  }>;
  experience?: Array<{
    quantity: number;
    skill_id: number;
  }>;
  skillMap?: Record<
    string,
    {
      id: number;
      name: string;
      title: string;
      skillCategoryStr: string;
    }
  >;
  claims?: Array<any>;
  empireMemberships?: BitjitaEmpireMembership[];
  marketOrders?: {
    sellOrders: Array<any>;
    buyOrders: Array<any>;
  };
}

export interface BitjitaPlayerDetailsResponse {
  player: BitjitaPlayerDetails;
}

class BitjitaPlayerService {
  private static instance: BitjitaPlayerService;
  private readonly BASE_URL = 'https://bitjita.com/api';
  private readonly CORS_PROXY = 'https://api.allorigins.win/get?url=';

  public static getInstance(): BitjitaPlayerService {
    if (!BitjitaPlayerService.instance) {
      BitjitaPlayerService.instance = new BitjitaPlayerService();
    }
    return BitjitaPlayerService.instance;
  }

  /**
   * Make a CORS-safe request to the Bitjita API
   * @param endpoint The API endpoint (without base URL)
   * @returns Promise with the response data
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.BASE_URL}${endpoint}`;

    try {
      console.log('🌐 Making API request to:', url);

      // First try Vite proxy (for local development)
      try {
        const proxyUrl = `/api/bitjita-proxy${endpoint}`;
        console.log('🔄 Trying Vite proxy:', proxyUrl);
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
          console.log('✅ Vite proxy request successful');
          return await proxyResponse.json();
        }
        console.log('⚠️ Vite proxy failed, trying direct request...');
      } catch (viteProxyError) {
        console.log(
          '⚠️ Vite proxy error:',
          viteProxyError instanceof Error
            ? viteProxyError.message
            : 'Unknown proxy error',
        );
      }

      // Try direct request second (in case CORS is resolved)
      try {
        const directResponse = await fetch(url);
        if (directResponse.ok) {
          console.log('✅ Direct API request successful');
          return await directResponse.json();
        }
        console.log('⚠️ Direct request failed, trying AllOrigins proxy...');
      } catch (corsError) {
        console.log(
          '⚠️ CORS error, using AllOrigins proxy:',
          corsError instanceof Error ? corsError.message : 'Unknown CORS error',
        );
      }

      // Use AllOrigins CORS proxy as final fallback
      const allOriginsUrl = `${this.CORS_PROXY}${encodeURIComponent(url)}`;
      console.log('🔄 Using AllOrigins proxy URL:', allOriginsUrl);

      const allOriginsResponse = await fetch(allOriginsUrl);

      if (!allOriginsResponse.ok) {
        throw new Error(
          `AllOrigins proxy request failed with status: ${allOriginsResponse.status}`,
        );
      }

      const allOriginsData = await allOriginsResponse.json();

      if (allOriginsData.status && allOriginsData.status.http_code === 200) {
        console.log('✅ AllOrigins proxy request successful');
        return JSON.parse(allOriginsData.contents);
      } else {
        console.error('❌ API returned error:', allOriginsData.status);
        throw new Error(
          `API request failed: ${allOriginsData.status?.http_code || 'Unknown error'}`,
        );
      }
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw new Error(
        'Unable to connect to Bitjita API. Please check your connection or try again later.',
      );
    }
  }

  /**
   * Search for players by username
   * @param query The search query (username)
   * @param limit Maximum number of results (default: 5)
   * @returns Promise with search results
   */
  async searchPlayers(
    query: string,
    limit: number = 5,
  ): Promise<BitjitaPlayerSearch> {
    if (!query.trim()) {
      return { players: [], total: 0 };
    }

    try {
      const data: BitjitaPlayerSearch = await this.makeRequest(
        `/players?q=${encodeURIComponent(query)}`,
      );

      // Limit results to the specified number
      return {
        players: data.players.slice(0, limit),
        total: data.total,
      };
    } catch (error) {
      console.error('Error searching players:', error);
      throw new Error(
        `Failed to search for players: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get detailed player information by entity ID
   * @param entityId The player's entity ID
   * @returns Promise with detailed player information
   */
  async getPlayerDetails(entityId: string): Promise<BitjitaPlayerDetails> {
    if (!entityId.trim()) {
      throw new Error('Entity ID is required');
    }

    try {
      const data: BitjitaPlayerDetailsResponse = await this.makeRequest(
        `/players/${encodeURIComponent(entityId)}`,
      );
      return data.player;
    } catch (error) {
      console.error('Error fetching player details:', error);
      throw new Error(
        `Failed to get player details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get the primary empire name for a player
   * @param player The player details object
   * @returns The empire name or null if no empire membership
   */
  getPlayerEmpire(player: BitjitaPlayerDetails): string | null {
    if (!player.empireMemberships || player.empireMemberships.length === 0) {
      return null;
    }

    // Return the first empire (could be enhanced to handle multiple empires)
    return player.empireMemberships[0].empireName;
  }

  /**
   * Check if a player is currently online
   * @param player The player object
   * @returns true if the player is signed in
   */
  isPlayerOnline(player: BitjitaPlayer): boolean {
    return player.signedIn;
  }

  /**
   * Format time played in a readable format
   * @param timePlayed Time played in seconds
   * @returns Formatted time string
   */
  formatTimePlayed(timePlayed: number): string {
    const hours = Math.floor(timePlayed / 3600);
    const minutes = Math.floor((timePlayed % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export default BitjitaPlayerService;
