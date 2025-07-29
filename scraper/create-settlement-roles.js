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

async function fetchUserSettlements(userId, inGameName) {
  if (!inGameName) {
    console.log(
      `   User ${userId} has no in_game_name, skipping settlement lookup`,
    );
    return [];
  }

  try {
    // Make a call to the Bitjita API to get user's claims/settlements
    const apiUrl = `https://bitjita.com/api/players/${userId}`;
    console.log(`   Fetching settlements from Bitjita API: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.log(
        `   Failed to fetch settlements for user ${inGameName}: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();

    if (!data || !data.player.claims) {
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

    // Fallback: get settlements from database as backup
    console.log(`   Falling back to database settlements...`);
    try {
      const { data: settlements, error: dbError } = await supabase
        .from('settlement_inventory')
        .select('settlement_entity_id');

      if (dbError) {
        console.log(`   Database fallback also failed: ${dbError.message}`);
        return [];
      }

      // Get unique settlement IDs as fallback
      const fallbackIds = [
        ...new Set(
          settlements.map((s) => s.settlement_entity_id).filter(Boolean),
        ),
      ];

      console.log(
        `   Using fallback: ${fallbackIds.length} settlements from database`,
      );
      return fallbackIds;
    } catch (fallbackError) {
      console.log(`   Fallback failed: ${fallbackError.message}`);
      return [];
    }
  }
}

async function createPerSettlementRoles() {
  console.log('🚀 Starting per-settlement role migration...\n');

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

    // Fetch all users with their current roles
    console.log('📋 Fetching all users with current roles...');
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        role_id,
        in_game_name,
        bitjita_user_id
      `,
      )
      .not('role_id', 'is', null); // Only users with existing roles

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${users.length} users with roles\n`);

    // Check if settlement_roles table exists
    console.log('🔍 Checking settlement_roles table...');
    const { error: tableError } = await supabase
      .from('settlement_roles')
      .select('*')
      .limit(1);

    if (tableError) {
      throw new Error(
        `settlement_roles table not found: ${tableError.message}`,
      );
    }
    console.log('✅ settlement_roles table found\n');

    let totalRolesCreated = 0;
    let usersProcessed = 0;

    // Process each user
    for (const user of users) {
      console.log(
        `\n👤 Processing user: ${user.bitjita_user_id} (${user.in_game_name || 'no in-game name'})`,
      );

      if (!user.in_game_name) {
        console.log('   ⏭️  Skipping user without in_game_name');
        continue;
      }

      // Fetch settlements for this user
      const settlementIds = await fetchUserSettlements(
        user.bitjita_user_id,
        user.in_game_name,
      );

      if (settlementIds.length === 0) {
        console.log('   ⏭️  No settlements found, skipping');
        continue;
      }

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
              role_id: 'b1d7bf25-01c7-49b4-86a0-b430e0ae4be5',
              settlement_id: settlementId,
              in_game_name: user.in_game_name,
            });

          if (insertError) {
            console.log(
              `     ❌ Failed to create settlement role for ${settlementId}: ${insertError.message}`,
            );
          } else {
            // console.log(
            //   `     ✅ Created ${user.roles.name} role for settlement ${settlementId}`,
            // );
            totalRolesCreated++;
          }
        } catch (error) {
          console.log(
            `     ❌ Error processing settlement ${settlementId}: ${error.message}`,
          );
        }
      }

      usersProcessed++;
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   Users processed: ${usersProcessed}`);
    console.log(`   Settlement role entries created: ${totalRolesCreated}`);

    // Verify the results
    console.log('\n🔍 Verifying results...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('settlement_roles')
      .select('settlement_id, role_id, profile_id');

    if (verifyError) {
      console.log('⚠️  Verification failed:', verifyError.message);
    } else {
      // Group the data manually
      const grouped = {};
      verifyData.forEach((item) => {
        const key = `${item.settlement_id}-${item.role_id}`;
        if (!grouped[key]) {
          grouped[key] = {
            settlement_id: item.settlement_id,
            role_id: item.role_id,
            count: 0,
          };
        }
        grouped[key].count++;
      });

      const groupedData = Object.values(grouped);
      console.log(
        `✅ Found ${groupedData.length} settlement-role combinations`,
      );

      // Show a summary of what was created
      console.log('\n📋 Settlement-Role Summary:');
      for (const item of groupedData) {
        console.log(
          `   Settlement ${item.settlement_id}: ${item.count} users with role ${item.role_id}`,
        );
      }
    }
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Per-Settlement Role Migration Script

Usage: node create-settlement-roles.cjs [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be created without making changes
  
This script will:
1. Fetch all users with existing roles from user_profiles
2. For each user, find settlements they have access to via settlement inventory data
3. Create new entries in settlement_roles table for each user-settlement-role combination

Prerequisites:
- settlement_roles table must exist with columns: profile_id, role_id, settlement_id
- VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
- Existing user_profiles with role assignments
`);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  // TODO: Implement dry run logic
  console.log('Dry run not implemented yet');
  process.exit(0);
}

// Run the migration
createPerSettlementRoles().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
