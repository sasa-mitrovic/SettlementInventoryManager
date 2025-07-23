-- Migration Script for Settlement Skills and Inventory Tables
-- Run this script in your Supabase SQL Editor after the members migration
-- This updates the tables to match the bitjita.com data structure from the scraper

-- ================================
-- SETTLEMENT_SKILLS TABLE MIGRATION
-- ================================

-- Step 1: Add missing columns to settlement_skills table
ALTER TABLE public.settlement_skills 
ADD COLUMN IF NOT EXISTS player_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS username VARCHAR(100),
ADD COLUMN IF NOT EXISTS skill_id INTEGER,
ADD COLUMN IF NOT EXISTS total_skills INTEGER,
ADD COLUMN IF NOT EXISTS highest_level INTEGER,
ADD COLUMN IF NOT EXISTS total_level INTEGER,
ADD COLUMN IF NOT EXISTS total_xp INTEGER,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;

-- Step 2: Migrate existing skills data if old columns exist
-- Also make old columns nullable to avoid constraint violations
DO $$
BEGIN
    -- Migrate player_name to username if player_name exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_skills' 
               AND column_name = 'player_name') THEN
        UPDATE public.settlement_skills 
        SET username = player_name 
        WHERE player_name IS NOT NULL AND username IS NULL;
        
        -- Make player_name nullable since scraper uses username instead
        ALTER TABLE public.settlement_skills ALTER COLUMN player_name DROP NOT NULL;
    END IF;
END $$;

-- Step 3: Update unique constraint for skills (allow multiple skills per player)
-- Also change ID column from UUID to VARCHAR to support scraper's custom IDs
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'settlement_skills_player_name_skill_name_key') THEN
        ALTER TABLE public.settlement_skills DROP CONSTRAINT settlement_skills_player_name_skill_name_key;
    END IF;
    
    -- Change ID column from UUID to VARCHAR to support scraper's custom composite IDs
    -- The scraper uses format like "144115188091587764-2" (playerEntityId-skillId)
    ALTER TABLE public.settlement_skills ALTER COLUMN id TYPE VARCHAR(200);
    
    -- Ensure the ID column doesn't use UUID generation anymore
    ALTER TABLE public.settlement_skills ALTER COLUMN id DROP DEFAULT;
END $$;

-- ================================
-- SETTLEMENT_INVENTORY TABLE MIGRATION  
-- ================================

-- Step 4: Add missing columns to settlement_inventory table
ALTER TABLE public.settlement_inventory 
ADD COLUMN IF NOT EXISTS building_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS building_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS building_nickname VARCHAR(200),
ADD COLUMN IF NOT EXISTS building_type INTEGER,
ADD COLUMN IF NOT EXISTS item_id INTEGER,
ADD COLUMN IF NOT EXISTS item_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS tier INTEGER,
ADD COLUMN IF NOT EXISTS icon VARCHAR(500),
ADD COLUMN IF NOT EXISTS location VARCHAR(200),
ADD COLUMN IF NOT EXISTS slot_index INTEGER,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE;

-- Step 5: Migrate existing inventory data if old columns exist
-- Also make old columns nullable to avoid constraint violations
DO $$
BEGIN
    -- Migrate container_name to location if container_name exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_inventory' 
               AND column_name = 'container_name') THEN
        UPDATE public.settlement_inventory 
        SET location = container_name 
        WHERE container_name IS NOT NULL AND location IS NULL;
        
        -- Make container_name nullable since scraper uses location instead
        ALTER TABLE public.settlement_inventory ALTER COLUMN container_name DROP NOT NULL;
    END IF;
    
    -- Migrate icon_url to icon if icon_url exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_inventory' 
               AND column_name = 'icon_url') THEN
        UPDATE public.settlement_inventory 
        SET icon = icon_url 
        WHERE icon_url IS NOT NULL AND icon IS NULL;
    END IF;
    
    -- Make item_name nullable since scraper uses item_id and item_name combination
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_inventory' 
               AND column_name = 'item_name'
               AND is_nullable = 'NO') THEN
        ALTER TABLE public.settlement_inventory ALTER COLUMN item_name DROP NOT NULL;
    END IF;
    
    -- Make quantity nullable for flexibility (though scraper should always provide this)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_inventory' 
               AND column_name = 'quantity'
               AND is_nullable = 'NO') THEN
        ALTER TABLE public.settlement_inventory ALTER COLUMN quantity DROP NOT NULL;
    END IF;
END $$;

-- Step 6: Update unique constraint for inventory (allow multiple items per building/slot)
-- Also change ID column from UUID to VARCHAR to support scraper's custom IDs
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'settlement_inventory_item_name_container_name_key') THEN
        ALTER TABLE public.settlement_inventory DROP CONSTRAINT settlement_inventory_item_name_container_name_key;
    END IF;
    
    -- Change ID column from UUID to VARCHAR to support scraper's custom composite IDs
    -- The scraper uses format like "144115188111376454-0" (buildingEntityId-slotIndex)
    ALTER TABLE public.settlement_inventory ALTER COLUMN id TYPE VARCHAR(200);
    
    -- Ensure the ID column doesn't use UUID generation anymore
    ALTER TABLE public.settlement_inventory ALTER COLUMN id DROP DEFAULT;
END $$;

-- Step 7: Add comments to explain the new columns
COMMENT ON TABLE public.settlement_skills IS 'Settlement skills data scraped from bitjita.com with detailed skill information';
COMMENT ON COLUMN public.settlement_skills.username IS 'Player username from bitjita.com';
COMMENT ON COLUMN public.settlement_skills.player_id IS 'Player entity ID from bitjita.com';
COMMENT ON COLUMN public.settlement_skills.skill_id IS 'Skill ID from bitjita.com';
COMMENT ON COLUMN public.settlement_skills.highest_level IS 'Player highest skill level';
COMMENT ON COLUMN public.settlement_skills.total_level IS 'Player total skill levels';
COMMENT ON COLUMN public.settlement_skills.total_xp IS 'Player total experience points';

COMMENT ON TABLE public.settlement_inventory IS 'Settlement inventory data scraped from bitjita.com with detailed building and slot information';
COMMENT ON COLUMN public.settlement_inventory.building_id IS 'Building entity ID from bitjita.com';
COMMENT ON COLUMN public.settlement_inventory.building_name IS 'Building name from bitjita.com';
COMMENT ON COLUMN public.settlement_inventory.building_type IS 'Building type ID from bitjita.com';
COMMENT ON COLUMN public.settlement_inventory.item_id IS 'Item ID from bitjita.com';
COMMENT ON COLUMN public.settlement_inventory.item_type IS 'Item type (item/cargo) from bitjita.com';
COMMENT ON COLUMN public.settlement_inventory.slot_index IS 'Inventory slot index within building';

-- Step 8: Verify the migrations
SELECT 'settlement_skills columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'settlement_skills' 
ORDER BY ordinal_position;

SELECT 'settlement_inventory columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'settlement_inventory' 
ORDER BY ordinal_position;

-- Migration completed!
-- Key changes made:
-- 1. Added missing columns for skills and inventory tables
-- 2. Changed ID columns from UUID to VARCHAR(200) to support scraper's custom composite IDs
--    - Skills: "playerEntityId-skillId" format (e.g., "144115188091587764-2")
--    - Inventory: "buildingEntityId-slotIndex" format (e.g., "144115188111376454-0")
-- 3. Migrated existing data to new column names
-- 4. Made old NOT NULL columns nullable to avoid constraint violations:
--    - settlement_skills.player_name (scraper uses 'username' instead)
--    - settlement_inventory.container_name (scraper uses 'location' instead)
--    - settlement_inventory.item_name (scraper provides this but constraint was too strict)
--    - settlement_inventory.quantity (made nullable for flexibility)
-- The scraper should now be able to insert data without UUID, column, or constraint errors
