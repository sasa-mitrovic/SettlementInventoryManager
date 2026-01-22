/* eslint-disable @typescript-eslint/no-explicit-any */
// Settlement Service - Handles settlement loading for users
// This service works in both development (direct access) and production (API calls)

import { Settlement } from '../types/settlement';

class SettlementService {
  private static instance: SettlementService;

  static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

  /**
   * Get settlements for a specific user
   * In development: Try API first, fallback to direct database access
   * In production: Always use API
   */
  async getUserSettlements(userId: string): Promise<Settlement[]> {
    try {
      console.log(
        `[SettlementService] Getting settlements for user: ${userId}`,
      );

      // Try the API endpoint first
      try {
        const response = await fetch(`/api/user-settlements/${userId}`);

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.settlements) {
            console.log(
              `[SettlementService] Got ${data.settlements.length} settlements from API`,
            );
            return this.convertToSettlements(data.settlements);
          }
        }
      } catch (apiError) {
        console.warn(
          '[SettlementService] API call failed, trying direct database access:',
          apiError,
        );
      }

      // Fallback: Direct database access using the dynamic scraper approach
      return await this.getUserSettlementsFromDatabase(userId);
    } catch (error) {
      console.error(
        '[SettlementService] Error getting user settlements:',
        error,
      );
      throw error;
    }
  }

  /**
   * Direct database access fallback method
   */
  private async getUserSettlementsFromDatabase(
    userId: string,
  ): Promise<Settlement[]> {
    try {
      console.log(
        `[SettlementService] Using database fallback for user: ${userId}`,
      );

      // Import dynamic scraper only when needed to avoid issues in browser environment
      const { supabaseClient } = await import('../supabase/supabaseClient');

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('bitjita_user_id, in_game_name')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error(
          `[SettlementService] Failed to get user profile for ${userId}:`,
          profileError,
        );
        return [];
      }

      if (!userProfile.bitjita_user_id) {
        console.error(
          `[SettlementService] No bitjita_user_id found for user ${userId} (${userProfile.in_game_name})`,
        );

        throw new Error(
          'User account is not properly configured. Please contact an administrator for assistance.',
        );
      }

      // Fetch player details from Bitjita API using backend proxy
      const playerDetailsUrl = `/api/bitjita-proxy?endpoint=players/${userProfile.bitjita_user_id}`;

      console.log(
        `[SettlementService] Fetching player details from: ${playerDetailsUrl}`,
      );

      const response = await fetch(playerDetailsUrl);

      if (!response.ok) {
        console.error(
          `[SettlementService] Failed to fetch player details: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const playerData = await response.json();

      // Extract settlements from the player data
      if (playerData.claims && playerData.claims.length > 0) {
        const settlements = playerData.claims.map(
          (claim: any, index: number) => ({
            id: claim.entityId,
            name: claim.name,
            role: this.determineUserRole(claim, userProfile.bitjita_user_id),
            isSelected: index === 0, // First settlement is selected by default
            ...claim, // Include all claim data
          }),
        );

        console.log(
          `[SettlementService] Found ${settlements.length} settlements for user ${userProfile.in_game_name}`,
        );
        return this.convertToSettlements(settlements);
      } else {
        console.log(
          `[SettlementService] No settlements found for user ${userProfile.in_game_name}`,
        );
        return [];
      }
    } catch (error) {
      console.error('[SettlementService] Error in database fallback:', error);
      return [];
    }
  }

  /**
   * Convert raw settlement data to Settlement interface
   */
  private convertToSettlements(rawSettlements: any[]): Settlement[] {
    return rawSettlements.map((claim: any) => ({
      entityId: claim.id || claim.entityId,
      name: claim.name,
      neutral: claim.neutral || false,
      regionId: claim.regionId || 0,
      regionName: claim.regionName || 'Unknown Region',
      supplies: claim.supplies || 0,
      buildingMaintenance: claim.buildingMaintenance || 0,
      numTiles: claim.numTiles || 0,
      numTileNeighbors: claim.numTileNeighbors || 0,
      locationX: claim.locationX || 0,
      locationZ: claim.locationZ || 0,
      locationDimension: claim.locationDimension || 0,
      treasury: claim.treasury || '0',
      xpGainedSinceLastCoinMinting: claim.xpGainedSinceLastCoinMinting || '0',
      suppliesPurchaseThreshold: claim.suppliesPurchaseThreshold || 0,
      suppliesPurchasePrice: claim.suppliesPurchasePrice || 0,
      buildingDescriptionId: claim.buildingDescriptionId || '',
      createdAt: claim.createdAt || new Date().toISOString(),
      updatedAt: claim.updatedAt || new Date().toISOString(),
      isOwner: claim.isOwner || claim.role === 'owner',
      memberPermissions: {
        inventoryPermission: claim.memberPermissions?.inventoryPermission || 1,
        buildPermission: claim.memberPermissions?.buildPermission || 1,
        officerPermission: claim.memberPermissions?.officerPermission || 0,
        coOwnerPermission: claim.memberPermissions?.coOwnerPermission || 0,
      },
    }));
  }

  /**
   * Determine the user's role in a settlement
   */
  private determineUserRole(claim: any, _bitjitaUserId: string): string {
    if (claim.isOwner) return 'owner';
    if (claim.memberPermissions?.coOwnerPermission === 1) return 'co-owner';
    if (claim.memberPermissions?.officerPermission === 1) return 'officer';
    return 'member';
  }
}

export default SettlementService;
