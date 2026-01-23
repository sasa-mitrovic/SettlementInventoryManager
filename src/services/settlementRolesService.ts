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
   * Automatically assigns admin role to settlement owners
   * Removes stale settlement affiliations that no longer exist in Bitjita
   */
  async syncUserSettlementRoles(userId: string): Promise<{
    success: boolean;
    settlementsProcessed: number;
    rolesCreated: number;
    rolesRemoved: number;
    error?: string;
  }> {
    try {
      // Get user profile with game name
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('id, in_game_name, bitjita_user_id')
        .eq('id', userId)
        .single();

      if (profileError && profileError?.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError);
        return {
          success: false,
          settlementsProcessed: 0,
          rolesCreated: 0,
          rolesRemoved: 0,
          error: `Failed to fetch user profile: ${profileError?.message}`,
        };
      }

      if (!userProfile?.in_game_name) {
        console.log('User has no in_game_name, skipping settlement sync');
        return {
          success: true,
          settlementsProcessed: 0,
          rolesCreated: 0,
          rolesRemoved: 0,
        };
      }

      // Fetch user's settlements from Bitjita API (includes ownership info)
      const settlements = await this.fetchUserSettlements(
        userProfile.bitjita_user_id,
        userProfile.in_game_name,
      );

      // Extract settlement IDs and ownership flags
      // Empty array means user has no settlements - we'll remove all their roles
      const settlementIds = settlements.map((s) => s.settlementId);
      const ownerSettlementIds = settlements
        .filter((s) => s.isOwner)
        .map((s) => s.settlementId);

      let rolesCreated = 0;
      let rolesRemoved = 0;

      // Use RPC function to safely sync settlement roles
      // Pass ownership info so owners get admin role automatically
      // Also removes any settlement_roles not in the API response
      try {
        const { data: syncResults, error: syncError } =
          await supabaseClient.rpc('sync_user_settlement_roles', {
            p_user_id: userProfile.id,
            p_settlement_ids: settlementIds,
            p_in_game_name: userProfile.in_game_name,
            p_owner_settlement_ids: ownerSettlementIds,
            p_remove_stale: true,
          });

        if (syncError) {
          console.error('Error syncing settlement roles:', syncError);
          return {
            success: false,
            settlementsProcessed: settlementIds.length,
            rolesCreated: 0,
            rolesRemoved: 0,
            error: `Failed to sync settlement roles: ${syncError.message}`,
          };
        }

        // Count how many were created/removed
        type SyncResult = {
          settlement_id: string;
          created: boolean;
          updated: boolean;
          removed: boolean;
          error_message: string | null;
        };

        rolesCreated =
          syncResults?.filter((result: SyncResult) => result.created)?.length ||
          0;
        rolesRemoved =
          syncResults?.filter((result: SyncResult) => result.removed)?.length ||
          0;
      } catch (error) {
        console.error('Failed to sync settlement roles:', error);
        return {
          success: false,
          settlementsProcessed: settlementIds.length,
          rolesCreated: 0,
          rolesRemoved: 0,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }

      return {
        success: true,
        settlementsProcessed: settlementIds.length,
        rolesCreated,
        rolesRemoved,
      };
    } catch (error) {
      console.error('Failed to sync user settlement roles:', error);
      return {
        success: false,
        settlementsProcessed: 0,
        rolesCreated: 0,
        rolesRemoved: 0,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Fetch user's settlements from Bitjita API
   * Returns settlement IDs along with ownership status
   */
  private async fetchUserSettlements(
    bitjitaUserId: string,
    inGameName: string,
  ): Promise<Array<{ settlementId: string; isOwner: boolean }>> {
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

      if (!data || !data.player?.claims) {
        console.log(`No claims data returned for user ${inGameName}`);
        return [];
      }

      // Extract settlement entity IDs and ownership status from the claims
      const settlements = data.player.claims
        .filter((claim: { entityId: string }) => claim.entityId)
        .map((claim: { entityId: string; isOwner?: boolean }) => ({
          settlementId: claim.entityId,
          isOwner: claim.isOwner === true,
        }));

      return settlements;
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
