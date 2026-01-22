import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

// Server-side script uses non-VITE prefixed env vars for service role key
// Falls back to VITE_ prefixed vars for backward compatibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function populateSettlements() {
  console.log('🏘️ Starting settlement population process...');

  try {
    // Step 1: Get all unique settlement_ids from settlement_roles table
    console.log('📋 Fetching unique settlement IDs from settlement_roles...');
    const { data: settlementRoles, error: rolesError } = await supabase
      .from('settlement_roles')
      .select('settlement_id')
      .order('settlement_id');

    console.log(settlementRoles);
    if (rolesError) {
      console.error('❌ Error fetching settlement roles:', rolesError);
      return;
    }

    // Get unique settlement IDs
    const uniqueSettlementIds = [
      ...new Set(settlementRoles.map((role) => role.settlement_id)),
    ];
    console.log(
      `🔍 Found ${uniqueSettlementIds.length} unique settlement IDs:`,
      uniqueSettlementIds,
    );

    // Step 2: Check which settlements already exist in our table
    console.log('📊 Checking existing settlements in database...');
    const { data: existingSettlements, error: existingError } = await supabase
      .from('settlements')
      .select('settlement_id')
      .in('settlement_id', uniqueSettlementIds);

    if (existingError) {
      console.error('❌ Error fetching existing settlements:', existingError);
      return;
    }

    const existingIds = existingSettlements.map((s) => s.settlement_id);
    const missingIds = uniqueSettlementIds.filter(
      (id) => !existingIds.includes(id),
    );

    console.log(`✅ Found ${existingSettlements.length} existing settlements`);
    console.log(`📥 Need to fetch ${missingIds.length} new settlements`);

    if (missingIds.length === 0) {
      console.log('🎉 All settlements already exist in database!');
      return;
    }

    // Step 3: Fetch settlement data from Bitjita API for missing settlements
    console.log('🌐 Fetching settlement data from Bitjita API...');
    const newSettlements = [];

    for (let i = 0; i < missingIds.length; i++) {
      const settlementId = missingIds[i];
      console.log(
        `⏳ [${i + 1}/${missingIds.length}] Fetching settlement ${settlementId}...`,
      );

      try {
        // Use the Bitjita API endpoint
        const response = await fetch(
          `https://bitjita.com/api/claims/${settlementId}`,
        );

        if (!response.ok) {
          console.error(
            `❌ Failed to fetch settlement ${settlementId}: ${response.status} ${response.statusText}`,
          );
          continue;
        }

        const settlementData = await response.json();
        // Extract settlement name from the API response
        let settlementName = 'Unknown Settlement';
        if (
          settlementData &&
          settlementData.claim &&
          settlementData.claim.name
        ) {
          settlementName = settlementData.claim.name;
        }

        newSettlements.push({
          settlement_id: settlementId,
          settlement_name: settlementName,
          isActive: true,
        });

        console.log(`✅ Found settlement: ${settlementName} (${settlementId})`);

        // Add a small delay to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (fetchError) {
        console.error(
          `❌ Error fetching settlement ${settlementId}:`,
          fetchError.message,
        );
        continue;
      }
    }

    // Step 4: Insert new settlements into database
    if (newSettlements.length > 0) {
      console.log(
        `💾 Inserting ${newSettlements.length} new settlements into database...`,
      );

      const { data: insertedData, error: insertError } = await supabase
        .from('settlements')
        .insert(newSettlements)
        .select();

      if (insertError) {
        console.error('❌ Error inserting settlements:', insertError);
        return;
      }

      console.log('🎉 Successfully inserted settlements:');
      insertedData.forEach((settlement) => {
        console.log(
          `  - ${settlement.settlement_name} (${settlement.settlement_id})`,
        );
      });
    }

    console.log('✅ Settlement population completed successfully!');
  } catch (error) {
    console.error('❌ Unexpected error during settlement population:', error);
  }
}

// Export the function for use in other modules
export { populateSettlements };

// Run the script only if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  populateSettlements();
}
