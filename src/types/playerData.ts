export interface Player {
  entityId: string;
  username: string;
  signedIn: boolean;
  timePlayed: number;
  timeSignedIn: number;
  teleportLocationX: number;
  teleportLocationZ: number;
  teleportLocationDimension: number;
  teleportLocationType: string;
  sessionStartTimestamp: string;
  signInTimestamp: string;
  travelerTasksExpiration: string;
  createdAt: string;
  updatedAt: string;
  experienceStacks: Experience[];
  lastLoginTimestamp: string;
  experience: Experience[];
  skillMap: { [key: string]: SkillMap };
  claims: Claim[];
  empireMemberships: EmpireMembership[];
  marketOrders: MarketOrders;
}

export interface Claim {
  entityId: string;
  name: string;
  neutral: boolean;
  regionId: number;
  regionName: RegionName;
  supplies: number;
  buildingMaintenance: number;
  numTiles: number;
  numTileNeighbors: number;
  locationX: number;
  locationZ: number;
  locationDimension: number;
  treasury: string;
  xpGainedSinceLastCoinMinting: string;
  suppliesPurchaseThreshold: number;
  suppliesPurchasePrice: number;
  buildingDescriptionId: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  memberPermissions: MemberPermissions;
}

export interface MemberPermissions {
  inventoryPermission: number;
  buildPermission: number;
  officerPermission: number;
  coOwnerPermission: number;
}

export enum RegionName {
  Oruvale = 'Oruvale',
}

export interface EmpireMembership {
  empireEntityId: string;
  empireName: string;
  rank: number;
  donatedShards: string;
  nobleTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  quantity: number;
  skill_id: number;
}

export interface MarketOrders {
  sellOrders: SellOrder[];
  buyOrders: any[];
}

export interface SellOrder {
  entityId: string;
  claimEntityId: string;
  itemId: string;
  itemType: number;
  priceThreshold: string;
  quantity: string;
  timestamp: string;
  storedCoins: string;
  createdAt: string;
  updatedAt: string;
  regionId: number;
  regionName: RegionName;
  itemName: string;
  iconAssetName: string;
  tier: number;
  rarityStr: RarityStr;
}

export enum RarityStr {
  Common = 'Common',
  Rare = 'Rare',
  Uncommon = 'Uncommon',
}

export interface SkillMap {
  id: number;
  name: string;
  title: string;
  skillCategoryStr: SkillCategoryStr;
}

export enum SkillCategoryStr {
  Adventure = 'Adventure',
  None = 'None',
  Profession = 'Profession',
}
