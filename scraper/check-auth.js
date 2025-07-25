import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Checking Auth Users and Profile System');
console.log('========================================\n');

async function checkAuthAndProfiles() {
  try {
    // Check auth.users table (this requires admin access)
    console.log('Step 1: Checking if we can access user data...');
    
    // Check user_profiles table structure
    console.log('Step 2: Checking user_profiles table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error accessing user_profiles table:', tableError);
      console.log('   This might be a permissions issue');
      return;
    }

    console.log('✅ user_profiles table is accessible');

    // Check if there are any profiles at all
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting profiles:', countError);
      return;
    }

    console.log(`📊 Total user_profiles records: ${count}`);

    if (count === 0) {
      console.log('\n🤔 No user profiles found. This means:');
      console.log('   1. No users have signed up yet, OR');
      console.log('   2. The signup process isn\'t creating profiles properly');
      console.log('\n💡 Solutions:');
      console.log('   1. Test the signup process by creating a user');
      console.log('   2. Check if the handle_new_user trigger is working');
      console.log('   3. Manually create a test profile for testing the updater');
    }

    // Test creating a sample profile for testing
    console.log('\nStep 3: Would you like to create a test profile?');
    console.log('   (This would help test the profile updater system)');

    // For now, let's show what would happen
    console.log('\n🧪 Test Profile Data (not created):');
    console.log('   Email: test@example.com');
    console.log('   In-game name: Lusti');
    console.log('   This would test the Bitjita API integration');

  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

// Run the check
checkAuthAndProfiles();
