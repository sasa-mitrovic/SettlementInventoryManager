import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error(
    'Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class BitjitaRealScraper {
  constructor() {
    this.settlementId = '144115188105096768'; // Extract settlement ID as property
    this.settlementUrl = `https://bitjita.com/claims/${this.settlementId}`;
    this.inventoryApiUrl = `https://bitjita.com/api/claims/${this.settlementId}/inventories`;
    this.baseUrl = 'https://bitjita.com';
  }

  async fetchPageContent(url) {
    try {
      console.log(`Fetching data from: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return html;
    } catch (error) {
      console.error('Error fetching page content:', error);
      throw error;
    }
  }

  async fetchInventoryFromAPI() {
    try {
      console.log(`Fetching inventory data from API: ${this.inventoryApiUrl}`);
      const response = await fetch(this.inventoryApiUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✓ Successfully fetched inventory data from API');
      return data;
    } catch (error) {
      console.error('Error fetching inventory from API:', error);
      throw error;
    }
  }

  async scrapeInventoryData() {
    try {
      // Try API first, fallback to HTML scraping if API fails
      try {
        return await this.scrapeInventoryFromAPI();
      } catch (apiError) {
        console.warn(
          '⚠️ API fetch failed, falling back to HTML scraping:',
          apiError.message,
        );
        return await this.scrapeInventoryFromHTML();
      }
    } catch (error) {
      console.error('Error scraping inventory data:', error);
      return [];
    }
  }

  async scrapeInventoryFromAPI() {
    try {
      const apiData = await this.fetchInventoryFromAPI();
      const inventoryItems = [];

      if (!apiData) {
        console.log('❌ No inventory data found from API');
        return inventoryItems;
      }

      console.log('Processing inventory data from API...');

      // We need item lookup data for name resolution
      // Fall back to HTML scraping to get the item/cargo lookup data
      console.log(
        '📋 Fetching item lookup data from HTML for name resolution...',
      );
      const html = await this.fetchPageContent(this.settlementUrl);
      const settlementData = await this.parseDataFromScripts(html);

      // Create lookup maps for items and cargos
      const itemMap = new Map();
      const cargoMap = new Map();

      if (settlementData && settlementData.items && settlementData.cargos) {
        // Parse items data
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

        // Parse cargos data
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

        console.log(
          `✓ Loaded ${itemMap.size} items and ${cargoMap.size} cargos for lookup`,
        );
      }

      // Process the API response structure
      // The exact structure depends on the API response format
      if (apiData.buildings || apiData.containers || apiData.inventories) {
        const buildings =
          apiData.buildings || apiData.containers || apiData.inventories || [];

        console.log(
          `Processing ${buildings.length} buildings/containers from API...`,
        );

        buildings.forEach((building, buildingIndex) => {
          if (building.inventory && Array.isArray(building.inventory)) {
            building.inventory.forEach((slot, slotIndex) => {
              if (slot.contents || slot.item) {
                const item = slot.contents || slot.item || slot;
                const itemId = item.item_id || item.id;
                const quantity = item.quantity || 1;
                const itemType = item.item_type || item.type || 'item';

                // Look up item details from our maps
                let itemDetails;
                if (itemType === 'cargo') {
                  itemDetails = cargoMap.get(itemId);
                } else {
                  itemDetails = itemMap.get(itemId);
                }

                // Create unique location name
                const baseName =
                  building.buildingNickname ||
                  building.nickname ||
                  building.buildingName ||
                  building.name ||
                  'Unknown Container';
                const buildingId =
                  building.entityId || building.id || buildingIndex;
                const location = baseName;

                inventoryItems.push({
                  id: `${building.entityId || building.id || buildingIndex}-${slotIndex}`,
                  building_id:
                    building.entityId || building.id || buildingIndex,
                  building_name:
                    building.buildingName ||
                    building.name ||
                    `Building ${buildingIndex}`,
                  building_nickname:
                    building.buildingNickname || building.nickname || null,
                  building_type:
                    building.buildingDescriptionId || building.type || 0,
                  item_id: itemId,
                  item_name: itemDetails
                    ? itemDetails.name
                    : item.name || item.item_name || `Unknown Item (${itemId})`,
                  item_type: itemType,
                  quantity: quantity,
                  tier: itemDetails ? itemDetails.tier : item.tier || null,
                  rarity: itemDetails
                    ? itemDetails.rarity
                    : item.rarity || item.rarityStr || 'Common',
                  icon: itemDetails
                    ? itemDetails.iconAssetName
                    : item.icon || item.iconAssetName || null,
                  location: location,
                  slot_index: slotIndex,
                  timestamp: new Date().toISOString(),
                });
              }
            });
          }
        });
      }

      console.log(
        `✓ Processed ${inventoryItems.length} inventory items from API`,
      );
      return inventoryItems;
    } catch (error) {
      console.error('Error processing API inventory data:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  async scrapeInventoryFromHTML() {
    try {
      const html = await this.fetchPageContent(this.settlementUrl);
      const settlementData = await this.parseDataFromScripts(html);
      const inventoryItems = [];

      if (!settlementData) {
        console.log('❌ No settlement data found');
        return inventoryItems;
      }

      if (
        settlementData.buildings &&
        settlementData.items &&
        settlementData.cargos
      ) {
        console.log(
          `Processing ${settlementData.buildings.length} buildings for inventory data...`,
        );

        // Create lookup maps for items and cargos
        const itemMap = new Map();
        const cargoMap = new Map();

        // Parse items data
        settlementData.items.forEach((item) => {
          if (item.id && item.name) {
            // Only add items with complete data
            itemMap.set(item.id, {
              name: item.name,
              tier: item.tier,
              rarity: item.rarityStr || 'Common',
              iconAssetName: item.iconAssetName,
            });
          }
        });

        // Parse cargos data
        settlementData.cargos.forEach((cargo, index) => {
          if (cargo.id && cargo.name) {
            // Only add cargos with complete data
            cargoMap.set(cargo.id, {
              name: cargo.name,
              tier: cargo.tier,
              rarity: cargo.rarityStr || 'Common',
              iconAssetName: cargo.iconAssetName,
            });
          }
        });

        // Process buildings and their inventories
        settlementData.buildings.forEach((building) => {
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

                // Create location name
                const baseName =
                  building.buildingNickname ||
                  building.buildingName ||
                  'Unknown Container';
                const location = baseName;

                inventoryItems.push({
                  id: `${building.entityId}-${slotIndex}`,
                  building_id: building.entityId,
                  building_name: building.buildingName,
                  building_nickname: building.buildingNickname,
                  building_type: building.buildingDescriptionId,
                  item_id: itemId,
                  item_name: itemDetails
                    ? itemDetails.name
                    : `Unknown Item (${itemId})`,
                  item_type: itemType,
                  quantity: quantity,
                  tier: itemDetails ? itemDetails.tier : null,
                  rarity: itemDetails ? itemDetails.rarity : 'Unknown',
                  icon: itemDetails
                    ? itemDetails.iconAssetName
                    : building.iconAssetName,
                  location: location,
                  slot_index: slotIndex,
                  timestamp: new Date().toISOString(),
                });
              }
            });
          }
        });
      }

      console.log(
        `✓ Processed ${inventoryItems.length} inventory items from ${settlementData.buildings?.length || 0} buildings`,
      );
      return inventoryItems;
    } catch (error) {
      console.error('Error scraping inventory data from HTML:', error);
      return [];
    }
  }

  async scrapeMembersData() {
    try {
      const html = await this.fetchPageContent(this.settlementUrl);
      const settlementData = await this.parseDataFromScripts(html);
      const members = [];

      if (!settlementData || !settlementData.members) {
        console.log('❌ No member data found');
        return members;
      }

      console.log(`Processing ${settlementData.members.length} members...`);

      settlementData.members.forEach((member) => {
        // Convert timestamp to check if online (within last hour)
        let isOnline = false;
        if (member.lastLoginTimestamp) {
          const loginTime = new Date(member.lastLoginTimestamp);
          const now = new Date();
          const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
          isOnline = hoursSinceLogin <= 1; // Consider online if logged in within last hour
        }

        // Determine role based on permissions
        let role = 'member';
        if (member.coOwnerPermission === 1) {
          role = 'co-owner';
        } else if (member.officerPermission === 1) {
          role = 'officer';
        } else if (member.buildPermission === 1) {
          role = 'builder';
        } else if (member.inventoryPermission === 1) {
          role = 'member';
        } else {
          role = 'guest';
        }

        members.push({
          id: member.entityId,
          player_id: member.playerEntityId,
          player: member.userName, // Player column based on userName
          storage: member.inventoryPermission === 1, // Storage column based on inventoryPermission
          build: member.buildPermission === 1, // Build column based on buildPermission
          officer: member.officerPermission === 1, // Officer column based on officerPermission
          co_owner: member.coOwnerPermission === 1, // Co-Owner column based on coOwnerPermission
          role: role,
          is_online: isOnline,
          last_login: member.lastLoginTimestamp || null,
          created_at: member.createdAt || null,
          updated_at: member.updatedAt || null,
          timestamp: new Date().toISOString(),
        });
      });

      console.log(`✓ Processed ${members.length} settlement members`);
      return members;
    } catch (error) {
      console.error('Error scraping members data:', error);
      return [];
    }
  }

  async scrapeSkillsData() {
    try {
      const html = await this.fetchPageContent(this.settlementUrl);
      const settlementData = await this.parseDataFromScripts(html);
      const skills = [];

      if (
        !settlementData ||
        !settlementData.citizens ||
        !settlementData.skillNames
      ) {
        console.log('❌ No citizen/skill data found');
        return skills;
      }

      console.log(
        `Processing skills for ${settlementData.citizens.length} citizens...`,
      );

      const skillNamesObj = settlementData.skillNames;

      settlementData.citizens.forEach((citizen) => {
        if (citizen.skills) {
          Object.entries(citizen.skills).forEach(([skillId, level]) => {
            const skillName = skillNamesObj[skillId] || `Skill ${skillId}`;

            skills.push({
              id: `${citizen.entityId}-${skillId}`,
              player_id: citizen.entityId,
              username: citizen.userName,
              skill_name: skillName,
              skill_level: parseInt(level),
              skill_id: parseInt(skillId),
              total_skills: citizen.totalSkills,
              highest_level: citizen.highestLevel,
              total_level: citizen.totalLevel,
              total_xp: citizen.totalXP,
              timestamp: new Date().toISOString(),
            });
          });
        }
      });

      console.log(
        `✓ Processed ${skills.length} skill entries for ${settlementData.citizens.length} citizens`,
      );
      return skills;
    } catch (error) {
      console.error('Error scraping skills data:', error);
      return [];
    }
  }

  async updateInventoryData(items) {
    try {
      if (items.length === 0) {
        console.log('No inventory items to update');
        return;
      }

      // Clear existing inventory data for this settlement
      const { error: deleteError } = await supabase
        .from('settlement_inventory')
        .delete()
        .eq('settlement_id', this.settlementId);

      if (deleteError) {
        console.error('Error clearing inventory:', deleteError);
        return;
      }

      // Insert new inventory data with settlement_id
      const { error: insertError } = await supabase
        .from('settlement_inventory')
        .insert(
          items.map((item) => ({
            ...item,
            settlement_id: this.settlementId,
            updated_at: new Date().toISOString(),
          })),
        );

      if (insertError) {
        console.error('Error inserting inventory:', insertError);
      } else {
        console.log(`Successfully updated ${items.length} inventory items`);
      }
    } catch (error) {
      console.error('Error updating inventory data:', error);
    }
  }

  async updateMembersData(members) {
    try {
      if (members.length === 0) {
        console.log('No members to update');
        return;
      }

      // Clear existing members data first to remove old members no longer in settlement
      const { error: deleteError } = await supabase
        .from('settlement_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Error clearing old members:', deleteError);
        return;
      }

      // Insert new members data
      const { error: insertError } = await supabase
        .from('settlement_members')
        .insert(
          members.map((member) => ({
            player: member.player, // Player column based on userName
            storage: member.storage, // Storage permission
            build: member.build, // Build permission
            officer: member.officer, // Officer permission
            co_owner: member.co_owner, // Co-Owner permission
            is_online: member.is_online,
            role: member.role,
            last_seen: member.is_online
              ? new Date().toISOString()
              : member.last_login,
            player_id: member.player_id,
            entity_id: member.id,
            created_at: member.created_at,
            updated_at: member.updated_at,
          })),
        );

      if (insertError) {
        console.error('Error inserting members:', insertError);
      } else {
        console.log(
          `Successfully updated ${members.length} settlement members`,
        );
      }
    } catch (error) {
      console.error('Error updating members data:', error);
    }
  }

  async updateSkillsData(skills) {
    try {
      if (skills.length === 0) {
        console.log('No skills to update');
        return;
      }

      // Clear existing skills data
      const { error: deleteError } = await supabase
        .from('settlement_skills')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Error clearing skills:', deleteError);
        return;
      }

      // Insert new skills data
      const { error: insertError } = await supabase
        .from('settlement_skills')
        .insert(skills);

      if (insertError) {
        console.error('Error inserting skills:', insertError);
      } else {
        console.log(`Successfully updated ${skills.length} skill entries`);
      }
    } catch (error) {
      console.error('Error updating skills data:', error);
    }
  }

  async exportDataToJSON(inventoryItems, members, skills) {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'scraped-data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create timestamp for filenames
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Prepare data objects
      const exportData = {
        timestamp: new Date().toISOString(),
        inventory: inventoryItems,
        members: members,
        skills: skills,
        summary: {
          inventoryCount: inventoryItems.length,
          membersCount: members.length,
          skillsCount: skills.length,
        },
      };

      // Export all data to a single comprehensive file
      const allDataFile = path.join(
        dataDir,
        `bitjita-settlement-${timestamp}.json`,
      );
      fs.writeFileSync(allDataFile, JSON.stringify(exportData, null, 2));

      // Export individual data types
      if (inventoryItems.length > 0) {
        const inventoryFile = path.join(dataDir, `inventory-${timestamp}.json`);
        fs.writeFileSync(
          inventoryFile,
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              data: inventoryItems,
            },
            null,
            2,
          ),
        );
      }

      if (members.length > 0) {
        const membersFile = path.join(dataDir, `members-${timestamp}.json`);
        fs.writeFileSync(
          membersFile,
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              data: members,
            },
            null,
            2,
          ),
        );
      }

      if (skills.length > 0) {
        const skillsFile = path.join(dataDir, `skills-${timestamp}.json`);
        fs.writeFileSync(
          skillsFile,
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              data: skills,
            },
            null,
            2,
          ),
        );
      }

      // Keep a latest snapshot
      const latestFile = path.join(dataDir, 'latest-settlement-data.json');
      fs.writeFileSync(latestFile, JSON.stringify(exportData, null, 2));

      console.log(`📁 Data exported to JSON files in ${dataDir}`);
      console.log(`   📄 Complete data: bitjita-settlement-${timestamp}.json`);
      console.log(`   📄 Latest snapshot: latest-settlement-data.json`);

      return dataDir;
    } catch (error) {
      console.error('❌ Error exporting data to JSON:', error);
    }
  }

  async parseDataFromScripts(html) {
    try {
      console.log('🔍 Searching for settlement data in scripts...');

      // Look for __sveltekit_[anything].resolve() calls with inventory data
      const resolveRegex =
        /__sveltekit_[^.]+\.resolve\(\s*(\{[\s\S]*?\})\s*\)/g;
      let match;
      let settlementData = null;

      while ((match = resolveRegex.exec(html)) !== null) {
        try {
          console.log('📝 Found __sveltekit_*.resolve call, parsing...');

          // Use eval to parse JavaScript object notation
          const jsCode = `(${match[1]})`;
          const resolveData = eval(jsCode);

          // Check if this contains inventory data (buildings, items, cargos)
          if (
            resolveData.data &&
            resolveData.data.buildings &&
            resolveData.data.items &&
            resolveData.data.cargos
          ) {
            settlementData = resolveData.data;
            console.log('✓ Found inventory data in __sveltekit_*.resolve call');
            console.log(`- Buildings: ${settlementData.buildings.length}`);
            console.log(`- Items: ${settlementData.items.length}`);
            console.log(`- Cargos: ${settlementData.cargos.length}`);

            // Count actual inventory items
            let totalSlots = 0;
            let slotsWithContents = 0;
            settlementData.buildings.forEach((building) => {
              if (building.inventory && Array.isArray(building.inventory)) {
                totalSlots += building.inventory.length;
                building.inventory.forEach((slot) => {
                  if (slot.contents) {
                    slotsWithContents++;
                  }
                });
              }
            });
            console.log(`- Total inventory slots: ${totalSlots}`);
            console.log(`- Slots with contents: ${slotsWithContents}`);
            break;
          }
        } catch (parseError) {
          console.log(
            'Script content not parsable as JS object:',
            parseError.message,
          );
        }
      }

      // If we found inventory data, we still need member/citizen data from kit.start
      if (settlementData) {
        console.log('� Looking for member/citizen data in kit.start...');

        const kitStartRegex =
          /kit\.start\(app,\s*element,\s*(\{[\s\S]*?data:\s*\[[\s\S]*?\]\s*[\s\S]*?\})\)/g;
        let kitMatch;

        while ((kitMatch = kitStartRegex.exec(html)) !== null) {
          try {
            // Extract the sveltekit identifier from the content
            const sveltekitMatch = kitMatch[1].match(/__sveltekit_([^.]+)/);
            const sveltekitId = sveltekitMatch ? sveltekitMatch[1] : 'unknown';

            // Create a safe context for parsing kit.start data with dynamic identifier
            const contextVar = `__sveltekit_${sveltekitId}`;
            const contextCode = `
              const ${contextVar} = {
                defer: (id) => \`__DEFERRED_\${id}__\`
              };
              (${kitMatch[1]})
            `;

            const kitData = eval(contextCode);

            if (
              kitData.data &&
              Array.isArray(kitData.data) &&
              kitData.data[1] &&
              kitData.data[1].data
            ) {
              const pageData = kitData.data[1].data;

              // Merge the data - inventory from resolve, members/citizens from kit.start
              settlementData.claim = pageData.claim;
              settlementData.members = pageData.members;
              settlementData.memberCount = pageData.memberCount;
              settlementData.citizens = pageData.citizens;
              settlementData.citizenCount = pageData.citizenCount;
              settlementData.skillNames = pageData.skillNames;

              console.log('✓ Successfully merged member/citizen data');
              console.log(
                `- Claim: ${settlementData.claim?.name || 'Unknown'}`,
              );
              console.log(`- Members: ${settlementData.members?.length || 0}`);
              console.log(
                `- Citizens: ${settlementData.citizens?.length || 0}`,
              );
              break;
            }
          } catch (kitParseError) {
            console.log(
              'Kit.start parsing failed with dynamic SvelteKit identifier (this is ok for inventory-only mode):',
              kitParseError.message,
            );
            // Continue without member/citizen data - we still have inventory data
          }
        }
      }

      if (!settlementData) {
        console.log('❌ No settlement data found in any script');
      }

      return settlementData;
    } catch (error) {
      console.error('Error parsing scripts:', error);
      return null;
    }
  }

  async scrapeAll() {
    console.log('🚀 Starting Bitjita settlement data scraping...');
    console.log(`📍 Target URL: ${this.settlementUrl}`);

    try {
      // Scrape all data types
      const [inventoryItems, members, skills] = await Promise.all([
        this.scrapeInventoryData(),
        this.scrapeMembersData(),
        this.scrapeSkillsData(),
      ]);

      // Update database
      await Promise.all([
        this.updateInventoryData(inventoryItems),
        this.updateMembersData(members),
        this.updateSkillsData(skills),
      ]);

      // Export data to JSON files
      await this.exportDataToJSON(inventoryItems, members, skills);

      console.log('✅ Scraping completed successfully!');
      console.log(`📦 Updated ${inventoryItems.length} inventory items`);
      console.log(`👥 Updated ${members.length} settlement members`);
      console.log(`⚡ Updated ${skills.length} skill entries`);
    } catch (error) {
      console.error('❌ Scraping failed:', error);
    }
  }
}

// Run the scraper
const scraper = new BitjitaRealScraper();

// Run immediately
scraper.scrapeAll();

// Set up interval to run every minute
setInterval(() => {
  console.log('\n' + '='.repeat(50));
  console.log('🔄 Running scheduled scrape...');
  scraper.scrapeAll();
}, 60000); // 60 seconds

console.log('🎯 Real Bitjita scraper started! Scraping every 60 seconds...');
console.log('Press Ctrl+C to stop.');
