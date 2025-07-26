import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Settlement, SettlementContext } from '../types/settlement';
import { useOptimizedUserWithProfile } from '../supabase/loader';
import BitjitaPlayerService from '../services/bitjitaPlayerService';

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
  const { userProfile } = useOptimizedUserWithProfile();

  // Simple flow: userProfile changes → load settlements
  const loadSettlements = useCallback(async () => {
    if (!userProfile) {
      console.log('📄 No user profile yet, waiting...');
      return;
    }

    console.log('� Starting settlement load process');
    console.log('� User profile:', {
      id: userProfile.id,
      email: userProfile.email,
      inGameName: userProfile.in_game_name,
      bitjitaUserId: userProfile.bitjita_user_id,
    });

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get the Bitjita User ID (with temporary fix for Lusti)
      let bitjitaUserId = userProfile.bitjita_user_id;
      if (userProfile.in_game_name === 'Lusti' && !bitjitaUserId) {
        console.log('🔧 Applying Lusti fix: using hardcoded Bitjita User ID');
        bitjitaUserId = '216172782152144831';
      }

      if (!bitjitaUserId) {
        throw new Error('No Bitjita User ID found for this account');
      }

      // Step 2: Fetch player data from Bitjita API
      console.log('🌐 Fetching player details from Bitjita API...');
      const playerService = BitjitaPlayerService.getInstance();
      const playerDetails = await playerService.getPlayerDetails(bitjitaUserId);

      // Step 3: Extract claims (settlements) from player data
      if (playerDetails?.claims && playerDetails.claims.length > 0) {
        console.log('✅ Found settlements:', playerDetails.claims);
        setSettlements(playerDetails.claims);

        // Step 4: Set first settlement as current (or restore from localStorage)
        const savedSettlementId = localStorage.getItem('currentSettlementId');
        const targetSettlement = savedSettlementId
          ? playerDetails.claims.find(
              (s) => s.entityId === savedSettlementId,
            ) || playerDetails.claims[0]
          : playerDetails.claims[0];

        setCurrentSettlement(targetSettlement);
        console.log('🎯 Current settlement set to:', targetSettlement.name);
      } else {
        console.log('⚠️ No settlements found for this user');
        setSettlements([]);
        setCurrentSettlement(null);
      }
    } catch (err) {
      console.error('❌ Error loading settlements:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load settlements',
      );

      // Fallback settlements for development
      const fallbackSettlements: Settlement[] = [
        {
          entityId: '144115188105096768',
          name: 'Gloomhaven (Fallback)',
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
  }, [userProfile]);

  // Trigger load when user profile becomes available
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
