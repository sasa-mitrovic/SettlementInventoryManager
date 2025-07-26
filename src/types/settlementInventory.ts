export interface SettlementInventory {
  buildings: Building[];
  items: Items[];
  cargos: Cargo[];
}

export interface Building {
  entityId: string;
  buildingDescriptionId: number;
  buildingName: string;
  buildingNickname: null | string;
  iconAssetName: string;
  inventory: Inventory[];
}

export interface Inventory {
  locked: boolean;
  volume: number;
  contents: Contents;
}

export interface Contents {
  item_id: number;
  quantity: number;
  item_type: string;
}

export interface Items {
  id: number;
  name: string;
  iconAssetName: string;
  rarity: number;
  rarityStr: string;
  tier: number;
}
export interface Cargo {
  id: number;
  name: string;
  iconAssetName: string;
  rarity: number;
  rarityStr: string;
  tier: number;
}
