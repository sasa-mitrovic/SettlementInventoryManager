import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Service Role Key Verification');
console.log('================================\n');

async function verifyServiceRoleKey() {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Check if we're using anon key vs service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    console.log('🔑 Key Check:');
    if (serviceKey === anonKey) {
      console.log('❌ PROBLEM: Using anon key instead of service role key');
      console.log(
        '   The service role key should be different from the anon key',
      );
      console.log(
        '   Please follow the instructions in SERVICE_ROLE_KEY_SETUP.md',
      );
      return;
    } else {
      console.log('✅ Using different key from anon key (good!)');
    }

    // Try to access user profiles
    console.log('\n📊 Database Access Test:');
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, email, in_game_name, empire, bitjita_entity_id')
      .limit(5);

    if (error) {
      console.log('❌ Database access failed:', error.message);
      console.log('   This might mean the service role key is incorrect');
      return;
    }

    console.log(`✅ Successfully found ${profiles.length} user profiles`);

    if (profiles.length > 0) {
      console.log('\n👥 Sample profiles:');
      profiles.forEach((profile, index) => {
        console.log(
          `${index + 1}. ${profile.in_game_name || 'No name'} (${profile.email})`,
        );
        console.log(`   Empire: ${profile.empire || 'Not set'}`);
        console.log(`   Entity ID: ${profile.bitjita_entity_id || 'Not set'}`);
      });

      // Count profiles that need updating
      const needsUpdate = profiles.filter(
        (p) => p.in_game_name && (!p.empire || !p.bitjita_entity_id),
      ).length;

      console.log(`\n📈 Update Status:`);
      console.log(
        `   Profiles with in-game names: ${profiles.filter((p) => p.in_game_name).length}`,
      );
      console.log(`   Profiles needing updates: ${needsUpdate}`);

      if (needsUpdate > 0) {
        console.log('\n🎯 Ready to run profile updates!');
        console.log('   Run: node user-profile-updater.js all');
      } else {
        console.log('\n✅ All profiles appear to be up to date');
      }
    } else {
      console.log('\n⚠️  No user profiles found');
      console.log("   This might mean users haven't signed up yet");
    }
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
}

// Run verification
verifyServiceRoleKey();
