// Script to parse the real cargo API response and generate static cargo data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CargoApiResponse {
  cargos: Array<{
    id: number;
    name: string;
    description: string;
    volume: number;
    tier: number;
    tag: string;
    rarity: number;
    rarityStr: string;
    iconAssetName: string;
    sellOrders: string;
    buyOrders: string;
    totalOrders: string;
    [key: string]: any;
  }>;
}

interface StaticCargoData {
  id: number;
  name: string;
  description: string;
  tier: number;
  tag: string;
  rarity: number;
  rarityStr: string;
  iconAssetName: string;
  volume: number;
  sellOrders: number;
  buyOrders: number;
  totalOrders: number;
}

function parseCargoData(): void {
  const filePath = path.join(__dirname, 'CargoApiResponse.txt');

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const apiResponse: CargoApiResponse = JSON.parse(rawData);

    console.log(`Found ${apiResponse.cargos.length} cargo items`);

    // Convert to our static data format
    const staticCargoData: StaticCargoData[] = apiResponse.cargos.map(
      (cargo) => ({
        id: cargo.id,
        name: cargo.name,
        description: cargo.description,
        tier: cargo.tier,
        tag: cargo.tag,
        rarity: cargo.rarity,
        rarityStr: cargo.rarityStr,
        iconAssetName: cargo.iconAssetName,
        volume: cargo.volume,
        sellOrders: parseInt(cargo.sellOrders) || 0,
        buyOrders: parseInt(cargo.buyOrders) || 0,
        totalOrders: parseInt(cargo.totalOrders) || 0,
      }),
    );

    // Find leather items for verification
    const leatherItems = staticCargoData.filter((item) =>
      item.name.toLowerCase().includes('leather'),
    );

    console.log(`Found ${leatherItems.length} leather items:`);
    leatherItems.forEach((item) => {
      console.log(
        `- ${item.name} (ID: ${item.id}, Tier: ${item.tier}, Rarity: ${item.rarityStr})`,
      );
    });

    // Generate the TypeScript file content
    const fileContent = `// This file contains static cargo data extracted from the real Bitjita API
// Generated from CargoApiResponse.txt on ${new Date().toISOString()}

export interface StaticCargoData {
  id: number;
  name: string;
  description: string;
  tier: number;
  tag: string;
  rarity: number;
  rarityStr: string;
  iconAssetName: string;
  volume: number;
  sellOrders: number;
  buyOrders: number;
  totalOrders: number;
}

export const STATIC_CARGO_DATA: StaticCargoData[] = ${JSON.stringify(staticCargoData, null, 2)};

// Helper functions for searching and filtering
export function searchStaticCargo(query: string): StaticCargoData[] {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return STATIC_CARGO_DATA;
  
  return STATIC_CARGO_DATA.filter(cargo => 
    cargo.name.toLowerCase().includes(searchTerm) ||
    cargo.description.toLowerCase().includes(searchTerm) ||
    cargo.tag.toLowerCase().includes(searchTerm)
  );
}

export function getCargoByTier(tier: number): StaticCargoData[] {
  return STATIC_CARGO_DATA.filter(cargo => cargo.tier === tier);
}

export function getCargoByTag(tag: string): StaticCargoData[] {
  return STATIC_CARGO_DATA.filter(cargo => 
    cargo.tag.toLowerCase() === tag.toLowerCase()
  );
}

export function getCargoByRarity(rarity: number): StaticCargoData[] {
  return STATIC_CARGO_DATA.filter(cargo => cargo.rarity === rarity);
}
`;

    // Write the new static data file
    const outputPath = path.join(__dirname, 'staticCargoData.ts');
    fs.writeFileSync(outputPath, fileContent);

    console.log(
      `Successfully generated ${outputPath} with ${staticCargoData.length} cargo items`,
    );
    console.log('File ready to replace the dummy data!');
  } catch (error) {
    console.error('Error parsing cargo data:', error);
  }
}

// Run the parser
parseCargoData();
