import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from the current directory
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

class BitjitaScraper {
  constructor() {
    this.settlementId = '144115188105096768';
    this.baseUrl = 'https://bitjita.com';
  }

  async getSampleInventoryData() {
    // Generate realistic sample data for testing
    const sampleItems = [
      {
        item_name: 'Iron Ore',
        tier: 1,
        rarity: 'common',
        quantity: 150,
        container_name: 'Storage Chest A',
      },
      {
        item_name: 'Coal',
        tier: 1,
        rarity: 'common',
        quantity: 89,
        container_name: 'Storage Chest A',
      },
      {
        item_name: 'Copper Ore',
        tier: 1,
        rarity: 'common',
        quantity: 67,
        container_name: 'Storage Chest B',
      },
      {
        item_name: 'Steel Ingot',
        tier: 2,
        rarity: 'uncommon',
        quantity: 34,
        container_name: 'Storage Chest B',
      },
      {
        item_name: 'Diamond',
        tier: 4,
        rarity: 'rare',
        quantity: 12,
        container_name: 'Vault',
      },
      {
        item_name: 'Mythril Ore',
        tier: 5,
        rarity: 'epic',
        quantity: 5,
        container_name: 'Vault',
      },
      {
        item_name: 'Dragonstone',
        tier: 6,
        rarity: 'legendary',
        quantity: 2,
        container_name: 'Vault',
      },
      {
        item_name: 'Wood Planks',
        tier: 1,
        rarity: 'common',
        quantity: 245,
        container_name: 'Lumber Storage',
      },
      {
        item_name: 'Stone Blocks',
        tier: 1,
        rarity: 'common',
        quantity: 189,
        container_name: 'Lumber Storage',
      },
      {
        item_name: 'Clay',
        tier: 1,
        rarity: 'common',
        quantity: 76,
        container_name: 'Lumber Storage',
      },
      {
        item_name: 'Health Potion',
        tier: 2,
        rarity: 'uncommon',
        quantity: 23,
        container_name: 'Alchemy Storage',
      },
      {
        item_name: 'Mana Potion',
        tier: 2,
        rarity: 'uncommon',
        quantity: 18,
        container_name: 'Alchemy Storage',
      },
      {
        item_name: 'Poison Antidote',
        tier: 3,
        rarity: 'rare',
        quantity: 8,
        container_name: 'Alchemy Storage',
      },
    ];

    // Randomly vary quantities to simulate changing inventory
    return sampleItems.map((item) => ({
      ...item,
      quantity: Math.max(
        1,
        item.quantity + Math.floor(Math.random() * 20) - 10,
      ),
    }));
  }

  async getSampleMembersData() {
    const sampleMembers = [
      {
        player_name: 'SettlementLeader',
        is_online: true,
        role: 'leader',
        can_invite: true,
        can_kick: true,
        last_seen: new Date(),
      },
      {
        player_name: 'ViceManager',
        is_online: Math.random() > 0.5,
        role: 'manager',
        can_invite: true,
        can_kick: false,
      },
      {
        player_name: 'MinerExpert',
        is_online: Math.random() > 0.3,
        role: 'member',
        can_invite: false,
        can_kick: false,
      },
      {
        player_name: 'CraftMaster',
        is_online: Math.random() > 0.3,
        role: 'member',
        can_invite: false,
        can_kick: false,
      },
      {
        player_name: 'NewRecruit',
        is_online: Math.random() > 0.6,
        role: 'member',
        can_invite: false,
        can_kick: false,
      },
      {
        player_name: 'BuilderPro',
        is_online: Math.random() > 0.4,
        role: 'member',
        can_invite: false,
        can_kick: false,
      },
      {
        player_name: 'ResourceGatherer',
        is_online: Math.random() > 0.5,
        role: 'member',
        can_invite: false,
        can_kick: false,
      },
    ];

    // Set last_seen for online members
    return sampleMembers.map((member) => ({
      ...member,
      last_seen: member.is_online ? new Date() : undefined,
    }));
  }

  async getSampleSkillsData() {
    const members = [
      'SettlementLeader',
      'ViceManager',
      'MinerExpert',
      'CraftMaster',
      'NewRecruit',
      'BuilderPro',
      'ResourceGatherer',
    ];
    const skills = [
      'Mining',
      'Crafting',
      'Building',
      'Farming',
      'Combat',
      'Magic',
      'Trading',
    ];
    const sampleSkills = [];

    members.forEach((memberName) => {
      // Each member has 3-5 skills with varying levels
      const memberSkillCount = Math.floor(Math.random() * 3) + 3;
      const memberSkills = [...skills]
        .sort(() => 0.5 - Math.random())
        .slice(0, memberSkillCount);

      memberSkills.forEach((skillName) => {
        const baseLevel =
          memberName === 'SettlementLeader'
            ? 40
            : memberName === 'ViceManager'
              ? 30
              : memberName === 'NewRecruit'
                ? 5
                : 15;

        const level = baseLevel + Math.floor(Math.random() * 20);
        const xp = level * 100 + Math.floor(Math.random() * 500);

        sampleSkills.push({
          player_name: memberName,
          skill_name: skillName,
          skill_level: level,
          skill_xp: xp,
        });
      });
    });

    return sampleSkills;
  }

  async updateInventoryData(items) {
    try {
      if (items.length === 0) {
        console.log('No inventory items to update');
        return;
      }

      // Clear existing inventory data
      const { error: deleteError } = await supabase
        .from('settlement_inventory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('Error clearing inventory:', deleteError);
        return;
      }

      // Insert new inventory data
      const { error: insertError } = await supabase
        .from('settlement_inventory')
        .insert(
          items.map((item) => ({
            ...item,
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

      // Upsert members data
      for (const member of members) {
        const { error } = await supabase.from('settlement_members').upsert(
          {
            player_name: member.player_name,
            is_online: member.is_online,
            role: member.role,
            can_invite: member.can_invite,
            can_kick: member.can_kick,
            last_seen: member.last_seen?.toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'player_name',
          },
        );

        if (error) {
          console.error(`Error updating member ${member.player_name}:`, error);
        }
      }

      console.log(`Successfully updated ${members.length} members`);
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('Error clearing skills:', deleteError);
        return;
      }

      // Insert new skills data
      const { error: insertError } = await supabase
        .from('settlement_skills')
        .insert(
          skills.map((skill) => ({
            ...skill,
            updated_at: new Date().toISOString(),
          })),
        );

      if (insertError) {
        console.error('Error inserting skills:', insertError);
      } else {
        console.log(`Successfully updated ${skills.length} skill entries`);
      }
    } catch (error) {
      console.error('Error updating skills data:', error);
    }
  }

  async scrapeAndUpdate() {
    console.log(
      `\n=== Starting data update at ${new Date().toISOString()} ===`,
    );

    try {
      // Generate sample data (in production this would scrape from bitjita.com)
      const [inventoryItems, members, skills] = await Promise.all([
        this.getSampleInventoryData(),
        this.getSampleMembersData(),
        this.getSampleSkillsData(),
      ]);

      console.log(
        `Generated ${inventoryItems.length} inventory items, ${members.length} members, ${skills.length} skills`,
      );

      // Update database with sample data
      await Promise.all([
        this.updateInventoryData(inventoryItems),
        this.updateMembersData(members),
        this.updateSkillsData(skills),
      ]);

      console.log('=== Data update completed successfully ===\n');
    } catch (error) {
      console.error('Error in data update cycle:', error);
    }
  }

  startPeriodicUpdates(intervalMinutes = 1) {
    console.log(
      `Starting periodic data updates every ${intervalMinutes} minute(s)`,
    );
    console.log(`Settlement ID: ${this.settlementId}`);
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(
      'Note: Using sample data for testing. In production, this would scrape from bitjita.com\n',
    );

    // Run initial update
    this.scrapeAndUpdate();

    // Set up interval for periodic updates
    setInterval(
      () => {
        this.scrapeAndUpdate();
      },
      intervalMinutes * 60 * 1000,
    );
  }
}

// Start the scraper
const scraper = new BitjitaScraper();
scraper.startPeriodicUpdates(1); // Update every minute
