// Settlement roles service
// Handles settlement role sync on login

import { supabaseClient } from '../supabase/supabaseClient';

export class SettlementRolesService {
  private static instance: SettlementRolesService;

  static getInstance(): SettlementRolesService {
    if (!SettlementRolesService.instance) {
      SettlementRolesService.instance = new SettlementRolesService();
    }
    return SettlementRolesService.instance;
  }

  /**
   * Sync user's settlement roles on login
   * Fetches user's settlements from Bitjita API and ensures they have appropriate roles
   */
  async syncUserSettlementRoles(userId: string): Promise<{
    success: boolean;
    settlementsProcessed: number;
    rolesCreated: number;
    error?: string;
  }> {
    try {
      // Get user profile with current role and game name
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('id, role_id, in_game_name, bitjita_user_id')
        .eq('id', userId)
        .single();

      if (profileError && profileError?.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
        return {
          success: false,
          settlementsProcessed: 0,
          rolesCreated: 0,
          error: `Failed to fetch user profile: ${profileError?.message}`,
        };
      }

      if (!userProfile?.role_id) {
        console.log('User has no role assigned, skipping settlement sync');
        return {
          success: true,
          settlementsProcessed: 0,
          rolesCreated: 0,
        };
      }

      if (!userProfile?.in_game_name) {
        console.log('User has no in_game_name, skipping settlement sync');
        return {
          success: true,
          settlementsProcessed: 0,
          rolesCreated: 0,
        };
      }

      // Fetch user's settlements from Bitjita API
      const settlementIds = await this.fetchUserSettlements(
        userProfile.bitjita_user_id,
        userProfile.in_game_name,
      );

      if (settlementIds.length === 0) {
        console.log('No settlements found for user');
        return {
          success: true,
          settlementsProcessed: 0,
          rolesCreated: 0,
        };
      }

      let rolesCreated = 0;

      // Use RPC function to safely sync settlement roles
      try {
        const { data: syncResults, error: syncError } =
          await supabaseClient.rpc('sync_user_settlement_roles', {
            p_user_id: userProfile.id,
            p_settlement_ids: settlementIds,
            p_role_id: userProfile.role_id,
            p_in_game_name: userProfile.in_game_name,
          });

        if (syncError) {
          console.error('Error syncing settlement roles:', syncError);
          return {
            success: false,
            settlementsProcessed: settlementIds.length,
            rolesCreated: 0,
            error: `Failed to sync settlement roles: ${syncError.message}`,
          };
        }

        // Count how many were created
        type SyncResult = {
          settlement_id: string;
          created: boolean;
          error_message: string | null;
        };

        rolesCreated =
          syncResults?.filter((result: SyncResult) => result.created)?.length ||
          0;
      } catch (error) {
        console.error('Failed to sync settlement roles:', error);
        return {
          success: false,
          settlementsProcessed: settlementIds.length,
          rolesCreated: 0,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }

      return {
        success: true,
        settlementsProcessed: settlementIds.length,
        rolesCreated,
      };
    } catch (error) {
      console.error('Failed to sync user settlement roles:', error);
      return {
        success: false,
        settlementsProcessed: 0,
        rolesCreated: 0,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Fetch user's settlements from Bitjita API
   * Private helper method for settlement role sync
   */
  private async fetchUserSettlements(
    bitjitaUserId: string,
    inGameName: string,
  ): Promise<string[]> {
    if (!inGameName) {
      return [];
    }

    try {
      // Make a call to the Bitjita API to get user's claims/settlements
      const apiUrl = `/api/bitjita-proxy?endpoint=players/${bitjitaUserId}`;

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(
          `Failed to fetch settlements for user ${inGameName}: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const data = await response.json();
      console.log('API response:', data);

      if (!data || !data.player?.claims) {
        console.log(`No claims data returned for user ${inGameName}`);
        return [];
      }

      // Extract settlement entity IDs from the claims
      const settlementIds = data.player.claims
        .map((claim: { entityId: string }) => claim.entityId)
        .filter(Boolean);

      return settlementIds;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`API request timeout for user ${inGameName}`);
      } else {
        console.warn(
          `Error fetching settlements for user ${inGameName}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      return [];
    }
  }
}

// Export singleton instance
export const settlementRolesService = SettlementRolesService.getInstance();
