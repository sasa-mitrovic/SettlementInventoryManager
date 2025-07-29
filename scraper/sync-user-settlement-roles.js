import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the env directory
dotenv.config({ path: join(__dirname, '../env/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking environment variables...');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ SET' : '❌ MISSING');
console.log(
  'SUPABASE_SERVICE_ROLE_KEY:',
  supabaseServiceRoleKey ? '✅ SET' : '❌ MISSING',
);

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('\n❌ Missing required environment variables');
  console.error(
    'Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fetchUserSettlements(bitjitaUserId, inGameName) {
  if (!inGameName) {
    console.log(`   User has no in_game_name, skipping settlement lookup`);
    return [];
  }

  try {
    // Make a call to the Bitjita API to get user's claims/settlements
    const apiUrl = `https://bitjita.com/api/players/${bitjitaUserId}`;
    console.log(`   Fetching settlements from Bitjita API: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.log(
        `   Failed to fetch settlements for user ${inGameName}: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();

    if (!data || !data.player?.claims) {
      console.log(`   No claims data returned for user ${inGameName}`);
      return [];
    }

    // Extract settlement entity IDs from the claims
    const settlementIds = data.player.claims
      .map((claim) => claim.entityId)
      .filter(Boolean);

    console.log(
      `   Found ${settlementIds.length} settlements for user ${inGameName}: ${settlementIds.join(', ')}`,
    );
    return settlementIds;
  } catch (error) {
    console.warn(
      `   Error fetching settlements for user ${inGameName}:`,
      error.message,
    );
    return [];
  }
}

async function syncSingleUserSettlementRoles(userIdentifier) {
  console.log(`🚀 Starting settlement role sync for user: ${userIdentifier}\n`);

  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    const { error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection successful\n');

    // Find user by ID, email, or in_game_name
    console.log(`📋 Finding user: ${userIdentifier}`);
    let query = supabase
      .from('user_profiles')
      .select('id, role_id, in_game_name, bitjita_user_id, email')
      .not('role_id', 'is', null);

    // Try different identifiers
    if (userIdentifier.includes('@')) {
      query = query.eq('email', userIdentifier);
    } else if (userIdentifier.length === 36 && userIdentifier.includes('-')) {
      // Looks like a UUID
      query = query.eq('id', userIdentifier);
    } else {
      // Assume it's an in_game_name
      query = query.eq('in_game_name', userIdentifier);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      throw new Error(`Failed to fetch user: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log(`❌ User not found: ${userIdentifier}`);
      return;
    }

    if (users.length > 1) {
      console.log(`⚠️  Multiple users found for: ${userIdentifier}`);
      console.log('Users found:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.in_game_name})`);
      });
      return;
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.email} (${user.in_game_name})\n`);

    if (!user.in_game_name) {
      console.log('❌ User has no in_game_name, cannot sync settlement roles');
      return;
    }

    // Fetch settlements for this user
    const settlementIds = await fetchUserSettlements(
      user.bitjita_user_id,
      user.in_game_name,
    );

    if (settlementIds.length === 0) {
      console.log('❌ No settlements found for user');
      return;
    }

    let rolesCreated = 0;

    // Create role entries for each settlement
    for (const settlementId of settlementIds) {
      try {
        // Check if this combination already exists
        const { data: existing, error: checkError } = await supabase
          .from('settlement_roles')
          .select('id')
          .eq('profile_id', user.id)
          .eq('role_id', user.role_id)
          .eq('settlement_id', settlementId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = no rows found
          console.log(
            `     ❌ Error checking existing role: ${checkError.message}`,
          );
          continue;
        }

        if (existing) {
          console.log(
            `     ⏭️  Role already exists for settlement ${settlementId}`,
          );
          continue;
        }

        // Insert new settlement role entry
        const { error: insertError } = await supabase
          .from('settlement_roles')
          .insert({
            profile_id: user.id,
            role_id: user.role_id,
            settlement_id: settlementId,
            in_game_name: user.in_game_name,
          });

        if (insertError) {
          console.log(
            `     ❌ Failed to create settlement role for ${settlementId}: ${insertError.message}`,
          );
        } else {
          console.log(`     ✅ Created role for settlement ${settlementId}`);
          rolesCreated++;
        }
      } catch (error) {
        console.log(
          `     ❌ Error processing settlement ${settlementId}: ${error.message}`,
        );
      }
    }

    console.log('\n🎉 Sync completed!');
    console.log(`📊 Summary:`);
    console.log(`   User: ${user.email} (${user.in_game_name})`);
    console.log(`   Settlements processed: ${settlementIds.length}`);
    console.log(`   New role entries created: ${rolesCreated}`);
  } catch (error) {
    console.error('\n💥 Sync failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
Single User Settlement Role Sync Script

Usage: node sync-user-settlement-roles.js <user_identifier>

Arguments:
  user_identifier    User email, UUID, or in_game_name

Examples:
  node sync-user-settlement-roles.js user@example.com
  node sync-user-settlement-roles.js PlayerName
  node sync-user-settlement-roles.js 12345678-1234-1234-1234-123456789abc

This script will:
1. Find the specified user in the database
2. Fetch their settlements from the Bitjita API
3. Create settlement_roles entries for each settlement they have access to

Prerequisites:
- settlement_roles table must exist with columns: profile_id, role_id, settlement_id
- VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
- User must have a role assigned and an in_game_name
`);
  process.exit(0);
}

const userIdentifier = args[0];
if (!userIdentifier) {
  console.error(
    '❌ Please provide a user identifier (email, UUID, or in_game_name)',
  );
  process.exit(1);
}

// Run the sync for the specified user
syncSingleUserSettlementRoles(userIdentifier).catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
