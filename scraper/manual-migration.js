import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../env/.env') });

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeBitjitaEntityId() {
  try {
    console.log(
      '🔄 Removing bitjita_entity_id column from user_profiles table...',
    );

    // Step 1: Drop the column
    console.log('   - Dropping bitjita_entity_id column...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS bitjita_entity_id;',
    });

    if (dropError) {
      console.error('❌ Error dropping column:', dropError);
      return;
    }

    console.log('   ✅ Column dropped successfully');

    // Step 2: Update the trigger function
    console.log('   - Updating handle_new_user function...');
    const newUserFunction = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
    user_in_game_name TEXT;
    user_empire TEXT;
    user_bitjita_user_id TEXT;
    user_bitjita_empire_id TEXT;
BEGIN
    -- Get the default role ID for 'User'
    SELECT id INTO default_role_id FROM public.roles WHERE role_name = 'User' LIMIT 1;
    
    -- Extract metadata from the new user
    user_in_game_name := NEW.raw_user_meta_data->>'in_game_name';
    user_empire := NEW.raw_user_meta_data->>'empire';
    user_bitjita_user_id := NEW.raw_user_meta_data->>'bitjita_user_id';
    user_bitjita_empire_id := NEW.raw_user_meta_data->>'bitjita_empire_id';
    
    -- Insert the new user profile without bitjita_entity_id
    INSERT INTO public.user_profiles (id, email, role_id, in_game_name, empire, bitjita_user_id, bitjita_empire_id)
    VALUES (NEW.id, NEW.email, default_role_id, user_in_game_name, user_empire, user_bitjita_user_id, user_bitjita_empire_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: newUserFunction,
    });

    if (functionError) {
      console.error('❌ Error updating function:', functionError);
      return;
    }

    console.log('   ✅ Function updated successfully');

    // Step 3: Update the update_user_profile_from_auth function
    console.log('   - Updating update_user_profile_from_auth function...');
    const updateFunction = `
CREATE OR REPLACE FUNCTION public.update_user_profile_from_auth(
    user_email TEXT,
    user_in_game_name TEXT DEFAULT NULL,
    user_empire TEXT DEFAULT NULL,
    user_bitjita_user_id TEXT DEFAULT NULL,
    user_bitjita_empire_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_profiles 
    SET 
        in_game_name = COALESCE(user_in_game_name, in_game_name),
        empire = COALESCE(user_empire, empire),
        bitjita_user_id = COALESCE(user_bitjita_user_id, bitjita_user_id),
        bitjita_empire_id = COALESCE(user_bitjita_empire_id, bitjita_empire_id),
        updated_at = NOW()
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

    const { error: updateFunctionError } = await supabase.rpc('exec_sql', {
      sql: updateFunction,
    });

    if (updateFunctionError) {
      console.error('❌ Error updating update function:', updateFunctionError);
      return;
    }

    console.log('   ✅ Update function updated successfully');

    // Step 4: Verify the schema
    console.log('   - Verifying table schema...');
    const { data: columns, error: schemaError } = await supabase.rpc(
      'exec_sql',
      {
        sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `,
      },
    );

    if (schemaError) {
      console.error('❌ Error checking schema:', schemaError);
      return;
    }

    console.log('   📋 Current user_profiles columns:');
    if (columns && Array.isArray(columns)) {
      columns.forEach((col) => {
        console.log(`      - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('   The bitjita_entity_id column has been removed.');
    console.log(
      '   Only bitjita_user_id remains (containing the entity ID value).',
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Check if exec_sql function exists, if not create it
async function ensureExecSqlFunction() {
  try {
    const createExecSql = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY EXECUTE sql;
END;
$$;`;

    await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  } catch (error) {
    // Function doesn't exist, let's try a different approach
    console.log('   - Using direct SQL execution...');
  }
}

console.log('🚀 Starting Database Migration: Remove bitjita_entity_id');
console.log('===============================================\n');

removeBitjitaEntityId();
