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
  console.error(
    'Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class UserProfileUpdater {
  constructor() {
    this.baseUrl = 'https://bitjita.com/api';
    this.proxyUrl = 'http://localhost:5173/api/bitjita-proxy'; // For development, falls back to direct API
  }

  /**
   * Search for a player using the Bitjita Player API
   */
  async searchPlayer(username) {
    try {
      // Step 1: Search for player to get entityId
      const searchUrl = `${this.baseUrl}/players?q=${encodeURIComponent(username)}`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const searchData = await response.json();

      if (!searchData.players || searchData.players.length === 0) {
        return null;
      }

      // Find the exact match (case-insensitive)
      const exactMatch = searchData.players.find(
        (player) => player.username.toLowerCase() === username.toLowerCase(),
      );

      if (!exactMatch) {
        return null;
      }

      // Step 2: Get detailed player info including empire data
      const detailUrl = `${this.baseUrl}/players/${exactMatch.entityId}`;
      const detailResponse = await fetch(detailUrl);

      if (!detailResponse.ok) {
        console.log(
          `Failed to get detailed info for ${username}, using basic data`,
        );
        // Return basic data if detailed call fails
        return {
          entityId: exactMatch.entityId,
          username: exactMatch.username,
          userId: exactMatch.entityId, // Use entityId as userId fallback
          empireMemberships: [],
        };
      }

      const detailedData = await detailResponse.json();

      // The API returns data wrapped in a "player" object
      const playerData = detailedData.player || detailedData;

      // Combine search data with detailed data
      return {
        entityId: exactMatch.entityId,
        username: exactMatch.username,
        userId: playerData.entityId || exactMatch.entityId,
        empireMemberships: playerData.empireMemberships || [],
        ...playerData, // Include any other fields from detailed response
      };
    } catch (error) {
      console.error(`Error searching for player ${username}:`, error.message);
      return null;
    }
  }

  /**
   * Get empire information for a player
   */
  async getPlayerEmpireInfo(playerData) {
    try {
      if (
        !playerData.empireMemberships ||
        playerData.empireMemberships.length === 0
      ) {
        return {
          empireName: null,
          empireId: null,
        };
      }

      // Get the first (primary) empire membership
      const primaryEmpire = playerData.empireMemberships[0];

      return {
        empireName: primaryEmpire.empireName || null,
        empireId: primaryEmpire.empireEntityId || null,
      };
    } catch (error) {
      console.error('Error getting empire info:', error.message);
      return {
        empireName: null,
        empireId: null,
      };
    }
  }

  /**
   * Update a single user profile with Bitjita API data
   */
  async updateUserProfile(userProfile) {
    try {
      console.log(`\n🔍 Updating profile for: ${userProfile.in_game_name}`);

      if (!userProfile.in_game_name) {
        console.log(`❌ Skipping user ${userProfile.email} - no in_game_name`);
        return false;
      }

      // Search for the player in Bitjita API
      const playerData = await this.searchPlayer(userProfile.in_game_name);

      if (!playerData) {
        console.log(
          `❌ Player ${userProfile.in_game_name} not found in Bitjita API`,
        );
        return false;
      }

      // Get empire information
      const empireInfo = await this.getPlayerEmpireInfo(playerData);

      // Prepare update data
      const updateData = {
        empire: empireInfo.empireName,
        bitjita_user_id: playerData.entityId || null,
        bitjita_empire_id: empireInfo.empireId,
        updated_at: new Date().toISOString(),
      };

      // Only update if we have new data
      const hasChanges =
        updateData.empire !== userProfile.empire ||
        updateData.bitjita_user_id !== userProfile.bitjita_user_id ||
        updateData.bitjita_empire_id !== userProfile.bitjita_empire_id;

      if (!hasChanges) {
        console.log(`✅ ${userProfile.in_game_name} - No changes needed`);
        return true;
      }

      // Update the user profile
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userProfile.id);

      if (error) {
        console.error(
          `❌ Error updating ${userProfile.in_game_name}:`,
          error.message,
        );
        return false;
      }

      console.log(`✅ ${userProfile.in_game_name} updated successfully`);
      console.log(`   Empire: ${updateData.empire || 'None'}`);
      console.log(`   User ID: ${updateData.bitjita_user_id || 'None'}`);
      console.log(`   Empire ID: ${updateData.bitjita_empire_id || 'None'}`);

      return true;
    } catch (error) {
      console.error(
        `❌ Error updating profile for ${userProfile.in_game_name}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get all user profiles that need updating
   */
  async getUserProfiles() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .not('in_game_name', 'is', null)
        .neq('in_game_name', '');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user profiles:', error.message);
      return [];
    }
  }

  /**
   * Update all user profiles with Bitjita API data
   */
  async updateAllProfiles() {
    try {
      console.log('🚀 Starting user profile update process...\n');

      const userProfiles = await this.getUserProfiles();

      if (userProfiles.length === 0) {
        console.log('ℹ️  No user profiles found with in_game_name');
        return;
      }

      console.log(`📊 Found ${userProfiles.length} user profiles to check\n`);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const profile of userProfiles) {
        const success = await this.updateUserProfile(profile);

        if (success) {
          updated++;
        } else {
          const playerData = await this.searchPlayer(profile.in_game_name);
          if (playerData) {
            errors++;
          } else {
            skipped++;
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('\n📈 Update Summary:');
      console.log(`✅ Updated: ${updated}`);
      console.log(`⏭️  Skipped (not found): ${skipped}`);
      console.log(`❌ Errors: ${errors}`);
      console.log(`📊 Total processed: ${userProfiles.length}`);
    } catch (error) {
      console.error('Error in updateAllProfiles:', error.message);
    }
  }

  /**
   * Update profiles for users who may have changed empires
   * Only updates profiles that haven't been updated recently
   */
  async updateStaleProfiles(hoursThreshold = 24) {
    try {
      console.log(
        `🔄 Checking for profiles updated more than ${hoursThreshold} hours ago...\n`,
      );

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursThreshold);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .not('in_game_name', 'is', null)
        .neq('in_game_name', '')
        .lt('updated_at', cutoffTime.toISOString());

      if (error) {
        throw error;
      }

      const userProfiles = data || [];

      if (userProfiles.length === 0) {
        console.log(
          `ℹ️  No stale profiles found (threshold: ${hoursThreshold} hours)`,
        );
        return;
      }

      console.log(`📊 Found ${userProfiles.length} stale profiles to update\n`);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const profile of userProfiles) {
        const success = await this.updateUserProfile(profile);

        if (success) {
          updated++;
        } else {
          const playerData = await this.searchPlayer(profile.in_game_name);
          if (playerData) {
            errors++;
          } else {
            skipped++;
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('\n📈 Stale Profile Update Summary:');
      console.log(`✅ Updated: ${updated}`);
      console.log(`⏭️  Skipped (not found): ${skipped}`);
      console.log(`❌ Errors: ${errors}`);
      console.log(`📊 Total processed: ${userProfiles.length}`);
    } catch (error) {
      console.error('Error in updateStaleProfiles:', error.message);
    }
  }
}

// Export for use in other modules
export { UserProfileUpdater };

// CLI functionality for running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new UserProfileUpdater();

  const command = process.argv[2];

  switch (command) {
    case 'all':
      await updater.updateAllProfiles();
      break;
    case 'stale':
      const hours = parseInt(process.argv[3]) || 24;
      await updater.updateStaleProfiles(hours);
      break;
    case 'user':
      const username = process.argv[3];
      if (!username) {
        console.error('Usage: node user-profile-updater.js user <username>');
        process.exit(1);
      }
      const profiles = await updater.getUserProfiles();
      const profile = profiles.find(
        (p) => p.in_game_name.toLowerCase() === username.toLowerCase(),
      );
      if (profile) {
        await updater.updateUserProfile(profile);
      } else {
        console.log(`User ${username} not found in database`);
      }
      break;
    default:
      console.log('Bitjita User Profile Updater');
      console.log('');
      console.log('Usage:');
      console.log(
        '  node user-profile-updater.js all                    # Update all profiles',
      );
      console.log(
        '  node user-profile-updater.js stale [hours]          # Update stale profiles (default: 24 hours)',
      );
      console.log(
        '  node user-profile-updater.js user <username>        # Update specific user',
      );
      console.log('');
      console.log('Examples:');
      console.log('  node user-profile-updater.js all');
      console.log('  node user-profile-updater.js stale 12');
      console.log('  node user-profile-updater.js user Lusti');
      break;
  }

  process.exit(0);
}
