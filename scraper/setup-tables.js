import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTables() {
  console.log('Setting up missing database tables...');

  try {
    // Create settlement_inventory table
    const { data: inventoryData, error: inventoryError } = await supabase.rpc(
      'exec_sql',
      {
        sql: `
        CREATE TABLE IF NOT EXISTS public.settlement_inventory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_name VARCHAR(200) NOT NULL,
          tier INTEGER,
          rarity VARCHAR(50),
          quantity INTEGER NOT NULL,
          container_name VARCHAR(200) NOT NULL,
          icon_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          UNIQUE(item_name, container_name)
        );
      `,
      },
    );

    if (inventoryError) {
      console.log(
        'Inventory table may already exist or exec_sql not available',
      );
    } else {
      console.log('✅ Created settlement_inventory table');
    }

    // Create settlement_skills table
    const { data: skillsData, error: skillsError } = await supabase.rpc(
      'exec_sql',
      {
        sql: `
        CREATE TABLE IF NOT EXISTS public.settlement_skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_name VARCHAR(100) NOT NULL,
          skill_name VARCHAR(100) NOT NULL,
          skill_level INTEGER,
          skill_xp INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          UNIQUE(player_name, skill_name)
        );
      `,
      },
    );

    if (skillsError) {
      console.log('Skills table may already exist or exec_sql not available');
    } else {
      console.log('✅ Created settlement_skills table');
    }

    console.log('\nTables setup completed! You can now run the data scraper.');
  } catch (error) {
    console.error('Error setting up tables:', error);
    console.log('\n⚠️  Manual setup required:');
    console.log(
      'Go to your Supabase Dashboard > SQL Editor and run the seed.sql file',
    );
  }
}

setupTables();
