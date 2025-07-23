-- Manual Database Migration Script
-- Run this script in your Supabase SQL Editor or database management tool
-- This updates the settlement_members table to match the bitjita.com data structure

-- Step 1: Backup existing data (optional but recommended)
-- CREATE TABLE settlement_members_backup AS SELECT * FROM settlement_members;

-- Step 2: Add new permission columns
ALTER TABLE public.settlement_members 
ADD COLUMN IF NOT EXISTS storage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS build BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS officer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS co_owner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS player_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);

-- Step 3: Rename player_name to player (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'player_name') THEN
        ALTER TABLE public.settlement_members RENAME COLUMN player_name TO player;
    END IF;
END $$;

-- Step 4: Update unique constraint
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'settlement_members_player_name_key') THEN
        ALTER TABLE public.settlement_members DROP CONSTRAINT settlement_members_player_name_key;
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'settlement_members_player_key') THEN
        ALTER TABLE public.settlement_members ADD CONSTRAINT settlement_members_player_key UNIQUE(player);
    END IF;
END $$;

-- Step 5: Migrate existing data (only if old permission columns exist)
-- Check and migrate storage permission based on has_access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'has_access') THEN
        UPDATE public.settlement_members 
        SET storage = has_access 
        WHERE has_access IS NOT NULL;
    END IF;
END $$;

-- Check and migrate build permission based on can_build
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'can_build') THEN
        UPDATE public.settlement_members 
        SET build = can_build 
        WHERE can_build IS NOT NULL;
    END IF;
END $$;

-- Check and migrate officer permission based on can_manage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'can_manage') THEN
        UPDATE public.settlement_members 
        SET officer = can_manage 
        WHERE can_manage IS NOT NULL;
    END IF;
END $$;

-- Check and migrate co_owner permission based on can_kick
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'can_kick') THEN
        UPDATE public.settlement_members 
        SET co_owner = can_kick 
        WHERE can_kick IS NOT NULL;
    END IF;
END $$;

-- Step 6: Add comments to explain the new columns
COMMENT ON TABLE public.settlement_members IS 'Settlement member data scraped from bitjita.com with individual permission columns';
COMMENT ON COLUMN public.settlement_members.player IS 'Player username from bitjita.com';
COMMENT ON COLUMN public.settlement_members.storage IS 'Storage/inventory permission (inventoryPermission from bitjita)';
COMMENT ON COLUMN public.settlement_members.build IS 'Build permission (buildPermission from bitjita)';
COMMENT ON COLUMN public.settlement_members.officer IS 'Officer permission (officerPermission from bitjita)';
COMMENT ON COLUMN public.settlement_members.co_owner IS 'Co-owner permission (coOwnerPermission from bitjita)';
COMMENT ON COLUMN public.settlement_members.player_id IS 'Player entity ID from bitjita.com';
COMMENT ON COLUMN public.settlement_members.entity_id IS 'Member entity ID from bitjita.com';

-- Step 7: Optional - Remove old columns if they exist and you've migrated the data
-- UNCOMMENT THESE LINES ONLY AFTER VERIFYING THE MIGRATION WORKED:
DO $$
BEGIN
    -- Only drop columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'has_access') THEN
        -- ALTER TABLE public.settlement_members DROP COLUMN has_access;
        RAISE NOTICE 'has_access column found - uncomment the ALTER TABLE statement above to remove it';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'can_build') THEN
        -- ALTER TABLE public.settlement_members DROP COLUMN can_build;
        RAISE NOTICE 'can_build column found - uncomment the ALTER TABLE statement above to remove it';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'can_manage') THEN
        -- ALTER TABLE public.settlement_members DROP COLUMN can_manage;
        RAISE NOTICE 'can_manage column found - uncomment the ALTER TABLE statement above to remove it';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'can_kick') THEN
        -- ALTER TABLE public.settlement_members DROP COLUMN can_kick;
        RAISE NOTICE 'can_kick column found - uncomment the ALTER TABLE statement above to remove it';
    END IF;
END $$;

-- Step 8: Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'settlement_members' 
ORDER BY ordinal_position;

-- Step 9: Test with sample data
-- SELECT player, storage, build, officer, co_owner FROM settlement_members LIMIT 5;

-- Migration completed!
-- The table now has columns: player, storage, build, officer, co_owner
-- These match the bitjita.com permission structure:
-- - player (userName)
-- - storage (inventoryPermission) 
-- - build (buildPermission)
-- - officer (officerPermission)
-- - co_owner (coOwnerPermission)
