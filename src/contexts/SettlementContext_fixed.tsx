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
    console.log('👤 User profile:', {
      inGameName: userProfile.in_game_name,
      bitjitaUserId: userProfile.bitjita_user_id,
    });

    if (!userProfile.bitjita_user_id) {
      // Provide fallback settlement for users without bitjita_user_id
      console.log('⚠️ No bitjita_user_id, using fallback settlement');
      const fallbackSettlements: Settlement[] = [
        {
          entityId: '144115188105096768',
          name: `${userProfile.in_game_name || 'Player'}'s Settlement (Demo)`,
          neutral: false,
          regionId: 1,
          regionName: 'Central Region',
          supplies: 1000,
          buildingMaintenance: 50,
          numTiles: 25,
          numTileNeighbors: 8,
          locationX: 0,
          locationZ: 0,
          locationDimension: 0,
          treasury: '5000',
          xpGainedSinceLastCoinMinting: '100',
          suppliesPurchaseThreshold: 100,
          suppliesPurchasePrice: 10,
          buildingDescriptionId: 'settlement_main',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOwner: false,
          memberPermissions: {
            inventoryPermission: 1,
            buildPermission: 1,
            officerPermission: 0,
            coOwnerPermission: 0,
          },
        },
      ];
      setSettlements(fallbackSettlements);
      setCurrentSettlement(fallbackSettlements[0]);
      return;
    }

    // Step 2: Fetch player settlements from Bitjita API via proxy
    const playerUrl = `/api/bitjita-proxy?endpoint=players/${userProfile.bitjita_user_id}&format=raw`;
    console.log('🌐 Fetching player data from:', playerUrl);

    const response = await fetch(playerUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch player data: ${response.status}`);
    }

    const playerData: any = await response.json();
    console.log('📊 Player data received:', playerData);

    // Step 3: Convert claims to settlements
    // Note: playerData has a nested 'player' object structure
    const player = playerData.player || playerData;
    if (!player.claims || player.claims.length === 0) {
      console.log('⚠️ No claims found for player');
      console.log('Player claims:', player.claims);
      setSettlements([]);
      setCurrentSettlement(null);
      return;
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

    console.log('✅ Found settlements:', playerSettlements);
    setSettlements(playerSettlements);

    // Set first settlement as current (or restore from localStorage)
    const savedSettlementId = localStorage.getItem('currentSettlementId');
    const targetSettlement = savedSettlementId
      ? playerSettlements.find(
          (s: Settlement) => s.entityId === savedSettlementId,
        ) || playerSettlements[0]
      : playerSettlements[0];

    setCurrentSettlement(targetSettlement);
    console.log('🎯 Current settlement set to:', targetSettlement.name);
  }, []);

  // Simple, direct settlement loading with impersonation support
  const loadSettlements = useCallback(async () => {
    if (!user) {
      console.log('📄 No user yet, waiting...');
      setIsLoading(false);
      return;
    }

    console.log('🏗️ Starting settlement load for user:', user.id);
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
          console.warn(
            '🎭 Admin function failed, using fallback:',
            adminFunctionError,
          );
        }

        // Fallback: Create minimal profile for impersonation
        console.log('🎭 Using fallback approach for impersonation');
        const fallbackProfile = {
          id: targetUserId,
          in_game_name: 'Impersonated User',
          bitjita_user_id: null, // Will trigger fallback settlement
        };

        await processUserProfile(fallbackProfile);
        return;
      }

      // Normal mode: Get user profile directly from database
      console.log('🔍 Querying user_profiles for user ID:', user.id);

      const { data: userProfiles, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id);

      console.log('📋 Query result:', {
        userProfiles,
        profileError,
        count: userProfiles?.length,
      });

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

      // Fallback settlement on error
      const fallbackSettlements: Settlement[] = [
        {
          entityId: '144115188105096768',
          name: 'Error Recovery Settlement',
          neutral: false,
          regionId: 1,
          regionName: 'Central Region',
          supplies: 1000,
          buildingMaintenance: 50,
          numTiles: 25,
          numTileNeighbors: 8,
          locationX: 0,
          locationZ: 0,
          locationDimension: 0,
          treasury: '5000',
          xpGainedSinceLastCoinMinting: '100',
          suppliesPurchaseThreshold: 100,
          suppliesPurchasePrice: 10,
          buildingDescriptionId: 'settlement_main',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOwner: false,
          memberPermissions: {
            inventoryPermission: 1,
            buildPermission: 1,
            officerPermission: 0,
            coOwnerPermission: 0,
          },
        },
      ];

      setSettlements(fallbackSettlements);
      setCurrentSettlement(fallbackSettlements[0]);
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
