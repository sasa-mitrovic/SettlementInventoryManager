import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__dirname);

dotenv.config({ path: join(__dirname, 'env/.env') });

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting Manual Migration: Remove bitjita_entity_id');
    console.log('==================================================\n');

    // Step 1: Check current schema
    console.log('📋 Checking current table schema...');
    const { data: beforeColumns, error: beforeError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'user_profiles')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (beforeError) {
      console.error('❌ Error checking current schema:', beforeError);
      return;
    }

    console.log('Current columns:');
    beforeColumns?.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const hasBitjitaEntityId = beforeColumns?.some(
      (col) => col.column_name === 'bitjita_entity_id',
    );

    if (!hasBitjitaEntityId) {
      console.log(
        '\n✅ bitjita_entity_id column does not exist. Migration not needed.',
      );
      return;
    }

    console.log(
      '\n🔄 Found bitjita_entity_id column. Proceeding with removal...',
    );

    // Step 2: Check current data
    console.log('\n📊 Checking current user data...');
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('in_game_name, bitjita_entity_id, bitjita_user_id')
      .not('bitjita_entity_id', 'is', null);

    if (usersError) {
      console.error('❌ Error checking user data:', usersError);
      return;
    }

    console.log(
      `Found ${users?.length || 0} users with bitjita_entity_id data:`,
    );
    users?.forEach((user) => {
      console.log(
        `  - ${user.in_game_name}: entity_id=${user.bitjita_entity_id}, user_id=${user.bitjita_user_id}`,
      );
    });

    // Step 3: Ensure bitjita_user_id has the entity_id data
    console.log('\n🔄 Ensuring bitjita_user_id contains entity_id data...');
    for (const user of users || []) {
      if (!user.bitjita_user_id && user.bitjita_entity_id) {
        console.log(
          `   - Copying entity_id to user_id for ${user.in_game_name}`,
        );
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ bitjita_user_id: user.bitjita_entity_id })
          .eq('in_game_name', user.in_game_name);

        if (updateError) {
          console.error(
            `   ❌ Error updating ${user.in_game_name}:`,
            updateError,
          );
        } else {
          console.log(`   ✅ Updated ${user.in_game_name}`);
        }
      }
    }

    console.log('\n✅ Data migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log(
      '1. Run the updated user-profile-updater.js to test the changes',
    );
    console.log(
      '2. If everything works, manually drop the bitjita_entity_id column using SQL:',
    );
    console.log(
      '   ALTER TABLE public.user_profiles DROP COLUMN bitjita_entity_id;',
    );
    console.log('\n🔧 The script has been updated to only use bitjita_user_id');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
