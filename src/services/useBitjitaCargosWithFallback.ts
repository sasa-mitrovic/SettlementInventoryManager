import React from 'react';
import {
  useBitjitaCargos as useOriginalBitjitaCargos,
  BitjitaCargo,
} from './bitjitaCargoCache';
import { STATIC_CARGO_DATA } from './staticCargoData';

// Enhanced hook that guarantees cargo data is always available
export function useBitjitaCargosWithFallback() {
  const { cargos: apiCargos, loading, error } = useOriginalBitjitaCargos();
  console.log(
    '[useBitjitaCargosWithFallback] apiCargos:',
    apiCargos.length,
    'loading:',
    loading,
    'error:',
    error,
  );

  // Convert static cargo data to BitjitaCargo format
  const staticCargosRef = React.useRef<BitjitaCargo[]>([]);

  if (staticCargosRef.current.length === 0) {
    staticCargosRef.current = STATIC_CARGO_DATA.map((staticCargo) => ({
      id: staticCargo.id,
      name: staticCargo.name,
      description: staticCargo.description,
      volume: staticCargo.volume,
      tier: staticCargo.tier,
      tag: staticCargo.tag,
      rarity: staticCargo.rarity,
      rarityStr: staticCargo.rarityStr,
      iconAssetName: staticCargo.iconAssetName,
      modelAssetName: 'Cargo/Package', // Default from API
      carriedModelAssetName: 'Cargo/Carried/CargoPackSupplies', // Default from API
      pickUpTime: 0.5, // Default from API
      placeTime: 0.3, // Default from API
      movementModifier: 0, // Default from API
      blocksPath: false,
      despawnTime: 86400, // Default from API
      notPickupable: false,
      sellOrders: staticCargo.sellOrders.toString(),
      buyOrders: staticCargo.buyOrders.toString(),
      totalOrders: staticCargo.totalOrders.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  // Use API data if available, otherwise use static fallback
  const cargos = React.useMemo(() => {
    if (apiCargos && apiCargos.length > 0) {
      console.log(
        '[useBitjitaCargosWithFallback] Using API cargo data:',
        apiCargos.length,
        'items',
      );
      return apiCargos;
    } else {
      console.log(
        '[useBitjitaCargosWithFallback] Using static fallback cargo data:',
        staticCargosRef.current.length,
        'items',
      );
      return staticCargosRef.current;
    }
  }, [apiCargos]);

  // Debug: Log leather items
  React.useEffect(() => {
    const leatherItems = cargos.filter((cargo) =>
      cargo.name.toLowerCase().includes('leather'),
    );
    console.log(
      '[useBitjitaCargosWithFallback] Leather items available:',
      leatherItems.map((item) => ({ id: item.id, name: item.name })),
    );
  }, [cargos]);

  return {
    cargos,
    loading: loading && cargos.length === 0, // Only show loading if we have no data at all
    error: cargos.length === 0 ? error : null, // Only show error if we have no fallback data
    usingFallback: cargos === staticCargosRef.current,
  };
}
