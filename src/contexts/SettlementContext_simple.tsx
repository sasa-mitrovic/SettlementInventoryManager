import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Settlement, SettlementContext } from '../types/settlement';
import { useAuth } from '../components/AuthProvider';
import { supabaseClient } from '../supabase/supabaseClient';

const SettlementContextProvider = createContext<SettlementContext | null>(null);

interface SettlementProviderProps {
  children: React.ReactNode;
}

export function SettlementProvider({ children }: SettlementProviderProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [currentSettlement, setCurrentSettlement] = useState<Settlement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Helper function to process user profile and load settlements
  const processUserProfile = useCallback(async (userProfile: any) => {
    if (!userProfile.bitjita_user_id) {
      throw new Error(
        `User ${userProfile.in_game_name || userProfile.id} has no bitjita_user_id. User must link their Bitjita account to access settlements.`,
      );
    }

    // Step 2: Fetch player settlements from Bitjita API via backend proxy
    const playerUrl = `/api/bitjita-proxy?endpoint=players/${userProfile.bitjita_user_id}`;

    const response = await fetch(playerUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🌐 Fetch error details:', errorText);
      throw new Error(
        `Failed to fetch player data: ${response.status} ${response.statusText}. Error: ${errorText}`,
      );
    }

    const playerData: any = await response.json();

    // Step 3: Convert claims to settlements
    // Note: playerData has a nested 'player' object structure
    const player = playerData.player || playerData;
    if (!player.claims || player.claims.length === 0) {
      throw new Error(
        `No settlements found for player ${userProfile.in_game_name || userProfile.id}. Player may not own any settlements in Bitjita.`,
      );
    }

    const playerSettlements: Settlement[] = player.claims.map((claim: any) => ({
      entityId: claim.entityId,
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
      isOwner: claim.isOwner || false,
      memberPermissions: {
        inventoryPermission: claim.memberPermissions?.inventoryPermission || 1,
        buildPermission: claim.memberPermissions?.buildPermission || 1,
        officerPermission: claim.memberPermissions?.officerPermission || 0,
        coOwnerPermission: claim.memberPermissions?.coOwnerPermission || 0,
      },
    }));

    setSettlements(playerSettlements);

    // Set first settlement as current (or restore from localStorage)
    const savedSettlementId = localStorage.getItem('currentSettlementId');
    const targetSettlement = savedSettlementId
      ? playerSettlements.find(
          (s: Settlement) => s.entityId === savedSettlementId,
        ) || playerSettlements[0]
      : playerSettlements[0];

    setCurrentSettlement(targetSettlement);
  }, []);

  // Simple, direct settlement loading with impersonation support
  const loadSettlements = useCallback(async () => {
    if (!user) {
      console.log('📄 No user yet, waiting...');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if we're in impersonation mode
      const isImpersonating =
        localStorage.getItem('impersonation_active') === 'true';
      const targetUserId = localStorage.getItem('impersonation_target_user');

      if (isImpersonating && targetUserId) {
        console.log(
          '🎭 Impersonation mode detected, fetching profile for:',
          targetUserId,
        );

        // During impersonation, try to get user profile via admin function
        try {
          const { data: userProfiles, error: rpcError } =
            await supabaseClient.rpc('get_user_profile_for_admin', {
              target_user_id: targetUserId,
            });

          if (rpcError) {
            console.warn('🎭 Admin function failed:', rpcError);
            throw rpcError;
          }

          if (userProfiles && userProfiles.length > 0) {
            console.log('🎭 Got impersonated user profile via admin function');
            await processUserProfile(userProfiles[0]);
            return;
          }
        } catch (adminFunctionError) {
          console.error('🎭 Admin function failed:', adminFunctionError);
          throw new Error(
            `Failed to get impersonated user profile: ${adminFunctionError instanceof Error ? adminFunctionError.message : 'Unknown error'}`,
          );
        }
      }

      // Normal mode: Get user profile directly from database

      const { data: userProfiles, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id);

      if (profileError) {
        console.error('❌ Database error getting user profile:', profileError);
        throw new Error(`Database error: ${profileError.message}`);
      }

      if (!userProfiles || userProfiles.length === 0) {
        console.error('❌ User profile not found for ID:', user.id);
        throw new Error(
          `User profile not found for ID: ${user.id}. This may be a permissions issue during impersonation.`,
        );
      }

      await processUserProfile(userProfiles[0]);
    } catch (err) {
      console.error('❌ Error loading settlements:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load settlements',
      );

      // Clear settlements on error - no fallbacks
      setSettlements([]);
      setCurrentSettlement(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, processUserProfile]);

  // Trigger load when user becomes available
  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  // Save current settlement to localStorage when it changes
  useEffect(() => {
    if (currentSettlement) {
      localStorage.setItem('currentSettlementId', currentSettlement.entityId);
    }
  }, [currentSettlement]);

  const contextValue: SettlementContext = {
    currentSettlement,
    settlements,
    setCurrentSettlement,
    isLoading,
    error,
  };

  return (
    <SettlementContextProvider.Provider value={contextValue}>
      {children}
    </SettlementContextProvider.Provider>
  );
}

export function useSettlement(): SettlementContext {
  const context = useContext(SettlementContextProvider);
  if (!context) {
    throw new Error('useSettlement must be used within a SettlementProvider');
  }
  return context;
}
