// Dynamic Settlement Scraper Service - Scrapes specific settlements on-demand
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class DynamicSettlementScraper {
  constructor() {
    this.baseUrl = 'https://bitjita.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  // Get settlements for a specific user/player
  async getUserSettlements(userId) {
    try {
      console.log(`[DynamicScraper] Getting settlements for user: ${userId}`);
      
      // This would need to be implemented based on how you get user's settlements
      // For now, return a placeholder that shows the concept
      return [
        { 
          id: '144115188105096768', 
          name: 'Gloomhaven',
          role: 'member',
          isSelected: true 
        }
        // Add more settlements as user has access to them
      ];
    } catch (error) {
      console.error('[DynamicScraper] Error getting user settlements:', error);
      return [];
    }
  }

  // Scrape inventory for a specific settlement
  async scrapeSettlementInventory(settlementId, userId = null) {
    try {
      console.log(`[DynamicScraper] Scraping inventory for settlement: ${settlementId}`);
      
      const settlementUrl = `${this.baseUrl}/claims/${settlementId}`;
      const inventoryApiUrl = `${this.baseUrl}/api/claims/${settlementId}/inventories`;
      
      console.log(`[DynamicScraper] Fetching from: ${inventoryApiUrl}`);
      
      const response = await fetch(inventoryApiUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[DynamicScraper] API failed (${response.status}), falling back to HTML parsing`);
        return await this.scrapeInventoryFromHTML(settlementId);
      }

      const apiData = await response.json();
      console.log(`[DynamicScraper] Successfully fetched API data for settlement ${settlementId}`);
      
      // Process the API data (similar to existing logic but with dynamic settlement ID)
      const inventoryItems = await this.processInventoryData(apiData, settlementId);
      
      // Update database with settlement-specific data
      await this.updateSettlementInventory(settlementId, inventoryItems, userId);
      
      return inventoryItems;
    } catch (error) {
      console.error(`[DynamicScraper] Error scraping settlement ${settlementId}:`, error);
      throw error;
    }
  }

  // Fallback HTML parsing for specific settlement
  async scrapeInventoryFromHTML(settlementId) {
    try {
      console.log(`[DynamicScraper] HTML fallback for settlement: ${settlementId}`);
      
      const settlementUrl = `${this.baseUrl}/claims/${settlementId}`;
      const response = await fetch(settlementUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const settlementData = await this.parseDataFromScripts(html);
      
      if (!settlementData || !settlementData.buildings) {
        console.log(`[DynamicScraper] No building data found for settlement ${settlementId}`);
        return [];
      }

      return await this.processHTMLInventoryData(settlementData, settlementId);
    } catch (error) {
      console.error(`[DynamicScraper] HTML parsing failed for settlement ${settlementId}:`, error);
      return [];
    }
  }

  // Process HTML inventory data for a specific settlement (missing method implementation)
  async processHTMLInventoryData(settlementData, settlementId) {
    const inventoryItems = [];
    
    if (!settlementData || !settlementData.buildings) {
      console.log(`[DynamicScraper] No buildings data in HTML response for settlement ${settlementId}`);
      return inventoryItems;
    }

    console.log(`[DynamicScraper] Processing ${settlementData.buildings.length} buildings from HTML for settlement ${settlementId}`);

    // Create lookup maps for items and cargos
    const itemMap = new Map();
    const cargoMap = new Map();

    // Parse items data
    if (settlementData.items) {
      settlementData.items.forEach((item) => {
        if (item.id && item.name) {
          itemMap.set(item.id, {
            name: item.name,
            tier: item.tier,
            rarity: item.rarityStr || 'Common',
            iconAssetName: item.iconAssetName,
          });
        }
      });
    }

    // Parse cargos data
    if (settlementData.cargos) {
      settlementData.cargos.forEach((cargo) => {
        if (cargo.id && cargo.name) {
          cargoMap.set(cargo.id, {
            name: cargo.name,
            tier: cargo.tier,
            rarity: cargo.rarityStr || 'Common',
            iconAssetName: cargo.iconAssetName,
          });
        }
      });
    }

    // Process buildings and their inventories
    settlementData.buildings.forEach((building, buildingIndex) => {
      if (building.inventory && Array.isArray(building.inventory)) {
        building.inventory.forEach((slot, slotIndex) => {
          if (slot.contents) {
            const itemId = slot.contents.item_id;
            const quantity = slot.contents.quantity || 1;
            const itemType = slot.contents.item_type || 'item';

            // Look up item details
            let itemDetails;
            if (itemType === 'cargo') {
              itemDetails = cargoMap.get(itemId);
            } else {
              itemDetails = itemMap.get(itemId);
            }

            // Safely handle rarity conversion to string
            let rarity = 'Common'; // Default
            if (itemDetails && itemDetails.rarity) {
              rarity = String(itemDetails.rarity);
            } else if (slot.contents.rarity) {
              rarity = String(slot.contents.rarity);
            } else if (slot.contents.rarityStr) {
              rarity = String(slot.contents.rarityStr);
            }

            inventoryItems.push({
              id: `${settlementId}-${building.entityId || building.id || buildingIndex}-${slotIndex}`,
              building_id: building.entityId || building.id || buildingIndex,
              building_name: building.buildingName || building.name || `Building ${buildingIndex}`,
              building_nickname: building.buildingNickname || building.nickname || null,
              building_type: building.buildingDescriptionId || building.type || 0,
              item_id: itemId,
              item_name: itemDetails ? itemDetails.name : slot.contents.name || slot.contents.item_name || `Unknown Item (${itemId || 'N/A'})`,
              item_type: itemType,
              quantity: quantity,
              tier: itemDetails ? itemDetails.tier : slot.contents.tier || null,
              rarity: rarity, // Use safely converted rarity
              icon: itemDetails ? itemDetails.iconAssetName : slot.contents.icon || slot.contents.iconAssetName || null,
              location: building.buildingNickname || building.buildingName || building.name || 'Unknown Container',
              slot_index: slotIndex,
              settlement_id: settlementId, // Dynamic settlement ID
              timestamp: new Date().toISOString(),
            });
          }
        });
      }
    });

    console.log(`[DynamicScraper] Processed ${inventoryItems.length} HTML items for settlement ${settlementId}`);
    return inventoryItems;
  }

  // Process API inventory data for a specific settlement
  async processInventoryData(apiData, settlementId) {
    const inventoryItems = [];
    
    if (!apiData || !apiData.buildings) {
      console.log(`[DynamicScraper] No buildings data in API response for settlement ${settlementId}`);
      return inventoryItems;
    }

    console.log(`[DynamicScraper] Processing ${apiData.buildings.length} buildings for settlement ${settlementId}`);

    // Get item/cargo lookup data for this settlement
    const lookupData = await this.getItemLookupData(settlementId);

    apiData.buildings.forEach((building, buildingIndex) => {
      if (building.inventory && Array.isArray(building.inventory)) {
        building.inventory.forEach((slot, slotIndex) => {
          if (slot.contents || slot.item) {
            const item = slot.contents || slot.item || slot;
            const itemId = item.item_id || item.id;
            const quantity = item.quantity || 1;
            const itemType = item.item_type || item.type || 'item';

            // Look up item details
            const itemDetails = lookupData.get(itemId, itemType);

            // Safely handle rarity conversion to string
            let rarity = 'Common'; // Default
            if (itemDetails && itemDetails.rarity) {
              rarity = String(itemDetails.rarity);
            } else if (item.rarity) {
              rarity = String(item.rarity);
            } else if (item.rarityStr) {
              rarity = String(item.rarityStr);
            }

            inventoryItems.push({
              id: `${settlementId}-${building.entityId || building.id || buildingIndex}-${slotIndex}`,
              building_id: building.entityId || building.id || buildingIndex,
              building_name: building.buildingName || building.name || `Building ${buildingIndex}`,
              building_nickname: building.buildingNickname || building.nickname || null,
              building_type: building.buildingDescriptionId || building.type || 0,
              item_id: itemId,
              item_name: itemDetails ? itemDetails.name : item.name || item.item_name || `Unknown Item (${itemId || 'N/A'})`,
              item_type: itemType,
              quantity: quantity,
              tier: itemDetails ? itemDetails.tier : item.tier || null,
              rarity: rarity, // Use safely converted rarity
              icon: itemDetails ? itemDetails.iconAssetName : item.icon || item.iconAssetName || null,
              location: building.buildingNickname || building.buildingName || building.name || 'Unknown Container',
              slot_index: slotIndex,
              settlement_id: settlementId, // Dynamic settlement ID
              timestamp: new Date().toISOString(),
            });
          }
        });
      }
    });

    console.log(`[DynamicScraper] Processed ${inventoryItems.length} items for settlement ${settlementId}`);
    return inventoryItems;
  }

  // Get item/cargo lookup data for a specific settlement
  async getItemLookupData(settlementId) {
    try {
      const settlementUrl = `${this.baseUrl}/claims/${settlementId}`;
      const response = await fetch(settlementUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        console.warn(`[DynamicScraper] Could not fetch lookup data for settlement ${settlementId}`);
        return new Map(); // Return empty map if we can't get lookup data
      }

      const html = await response.text();
      const settlementData = await this.parseDataFromScripts(html);
      
      const lookupMap = new Map();
      
      if (settlementData && settlementData.items) {
        settlementData.items.forEach((item) => {
          if (item.id && item.name) {
            lookupMap.set(`${item.id}_item`, {
              name: item.name,
              tier: item.tier,
              rarity: item.rarityStr || 'Common',
              iconAssetName: item.iconAssetName,
            });
          }
        });
      }

      if (settlementData && settlementData.cargos) {
        settlementData.cargos.forEach((cargo) => {
          if (cargo.id && cargo.name) {
            lookupMap.set(`${cargo.id}_cargo`, {
              name: cargo.name,
              tier: cargo.tier,
              rarity: cargo.rarityStr || 'Common',
              iconAssetName: cargo.iconAssetName,
            });
          }
        });
      }

      // Add a get method that handles both item types
      lookupMap.get = function(itemId, itemType = 'item') {
        return Map.prototype.get.call(this, `${itemId}_${itemType}`) || null;
      };

      console.log(`[DynamicScraper] Loaded ${lookupMap.size} lookup entries for settlement ${settlementId}`);
      return lookupMap;
    } catch (error) {
      console.error(`[DynamicScraper] Error getting lookup data for settlement ${settlementId}:`, error);
      return new Map();
    }
  }

  // Update database with settlement-specific inventory
  async updateSettlementInventory(settlementId, inventoryItems, userId = null) {
    try {
      if (inventoryItems.length === 0) {
        console.log(`[DynamicScraper] No inventory items to update for settlement ${settlementId}`);
        return;
      }

      // Clear existing inventory data for this specific settlement only
      const { error: deleteError } = await supabase
        .from('settlement_inventory')
        .delete()
        .eq('settlement_id', settlementId);

      if (deleteError) {
        console.error(`[DynamicScraper] Error clearing inventory for settlement ${settlementId}:`, deleteError);
        return;
      }

      // Insert new inventory data with settlement_id
      const { error: insertError } = await supabase
        .from('settlement_inventory')
        .insert(
          inventoryItems.map((item) => ({
            ...item,
            settlement_id: settlementId, // Ensure settlement_id is set
            updated_at: new Date().toISOString(),
          })),
        );

      if (insertError) {
        console.error(`[DynamicScraper] Error inserting inventory for settlement ${settlementId}:`, insertError);
        throw insertError;
      } else {
        console.log(`[DynamicScraper] Successfully updated ${inventoryItems.length} inventory items for settlement ${settlementId}`);
      }
    } catch (error) {
      console.error(`[DynamicScraper] Error updating inventory for settlement ${settlementId}:`, error);
      throw error;
    }
  }

  // Reuse the existing parseDataFromScripts method (copied from real-scraper.js)
  async parseDataFromScripts(html) {
    try {
      console.log('[DynamicScraper] Searching for settlement data in scripts...');

      const resolveRegex = /__sveltekit_[^.]+\.resolve\(\s*(\{[\s\S]*?\})\s*\)/g;
      let match;
      let settlementData = null;

      while ((match = resolveRegex.exec(html)) !== null) {
        try {
          const jsCode = `(${match[1]})`;
          const resolveData = eval(jsCode);

          if (
            resolveData.data &&
            resolveData.data.buildings &&
            resolveData.data.items &&
            resolveData.data.cargos
          ) {
            settlementData = resolveData.data;
            console.log('[DynamicScraper] Found inventory data in __sveltekit_*.resolve call');
            break;
          }
        } catch (parseError) {
          // Continue searching
        }
      }

      return settlementData;
    } catch (error) {
      console.error('[DynamicScraper] Error parsing scripts:', error);
      return null;
    }
  }

  // Scrape on demand for a specific user's selected settlement
  async scrapeForUser(userId, settlementId = null) {
    try {
      console.log(`[DynamicScraper] Starting scrape for user ${userId}`);
      
      // If no settlement specified, get user's current/selected settlement
      if (!settlementId) {
        const userSettlements = await this.getUserSettlements(userId);
        const selectedSettlement = userSettlements.find(s => s.isSelected) || userSettlements[0];
        
        if (!selectedSettlement) {
          throw new Error(`No accessible settlements found for user ${userId}`);
        }
        
        settlementId = selectedSettlement.id;
        console.log(`[DynamicScraper] Using selected settlement: ${settlementId} (${selectedSettlement.name})`);
      }

      // Scrape the specific settlement
      const inventoryItems = await this.scrapeSettlementInventory(settlementId, userId);
      
      return {
        success: true,
        settlementId,
        itemCount: inventoryItems.length,
        timestamp: new Date().toISOString(),
        userId,
      };
    } catch (error) {
      console.error(`[DynamicScraper] Error in scrapeForUser:`, error);
      return {
        success: false,
        error: error.message,
        userId,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export the class for use in API endpoints
export { DynamicSettlementScraper };

// For direct usage (if run as a script)
export default DynamicSettlementScraper;
