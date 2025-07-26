// Settlement types and interfaces for multi-settlement support

export interface Settlement {
  entityId: string;
  name: string;
  neutral: boolean;
  regionId: number;
  regionName: string;
  supplies: number;
  buildingMaintenance: number;
  numTiles: number;
  numTileNeighbors: number;
  locationX: number;
  locationZ: number;
  locationDimension: number;
  treasury: string;
  xpGainedSinceLastCoinMinting?: string;
  suppliesPurchaseThreshold?: number;
  suppliesPurchasePrice?: number;
  buildingDescriptionId?: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  memberPermissions: {
    inventoryPermission: number;
    buildPermission: number;
    officerPermission: number;
    coOwnerPermission: number;
  };
}

export interface SettlementContext {
  currentSettlement: Settlement | null;
  settlements: Settlement[];
  setCurrentSettlement: (settlement: Settlement) => void;
  isLoading: boolean;
  error: string | null;
}

// Permission levels (from Bitjita API)
export enum PermissionLevel {
  NONE = 0,
  GRANTED = 1,
}

// Helper functions
export function hasInventoryPermission(settlement: Settlement): boolean {
  return (
    settlement.memberPermissions.inventoryPermission === PermissionLevel.GRANTED
  );
}

export function hasBuildPermission(settlement: Settlement): boolean {
  return (
    settlement.memberPermissions.buildPermission === PermissionLevel.GRANTED
  );
}

export function hasOfficerPermission(settlement: Settlement): boolean {
  return (
    settlement.memberPermissions.officerPermission === PermissionLevel.GRANTED
  );
}

export function hasCoOwnerPermission(settlement: Settlement): boolean {
  return (
    settlement.memberPermissions.coOwnerPermission === PermissionLevel.GRANTED
  );
}

export function getPermissionLevel(
  settlement: Settlement,
): 'owner' | 'co-owner' | 'officer' | 'member' {
  if (settlement.isOwner) return 'owner';
  if (hasCoOwnerPermission(settlement)) return 'co-owner';
  if (hasOfficerPermission(settlement)) return 'officer';
  return 'member';
}

export function getPermissionColor(level: string): string {
  switch (level) {
    case 'owner':
      return 'gold';
    case 'co-owner':
      return 'violet';
    case 'officer':
      return 'blue';
    default:
      return 'gray';
  }
}
