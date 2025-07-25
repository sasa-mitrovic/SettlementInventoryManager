import { UserProfileUpdater } from './user-profile-updater.js';

/**
 * Script to manually run user profile updates
 * This can be used for one-time updates or troubleshooting
 */

console.log('🚀 Manual User Profile Update Script');
console.log('=====================================\n');

const updater = new UserProfileUpdater();

async function runManualUpdate() {
  try {
    // First, update all profiles to get baseline data
    console.log('Phase 1: Updating all user profiles...');
    await updater.updateAllProfiles();

    console.log('\n' + '='.repeat(50) + '\n');

    // Then check for any that might need updates (stale profiles)
    console.log('Phase 2: Checking for stale profiles...');
    await updater.updateStaleProfiles(1); // Check profiles older than 1 hour

    console.log('\n✅ Manual update process completed!');
  } catch (error) {
    console.error('❌ Error during manual update:', error);
  }

  process.exit(0);
}

// Run the update
runManualUpdate();
