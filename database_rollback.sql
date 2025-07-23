-- Rollback Script for Settlement Members Table Migration
-- Use this script if you need to revert the changes made by database_migration.sql

-- Step 1: Restore old column names and structure (only if they don't exist)
-- Add back old columns if they were removed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settlement_members' 
                   AND column_name = 'has_access') THEN
        ALTER TABLE public.settlement_members ADD COLUMN has_access BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settlement_members' 
                   AND column_name = 'can_build') THEN
        ALTER TABLE public.settlement_members ADD COLUMN can_build BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settlement_members' 
                   AND column_name = 'can_manage') THEN
        ALTER TABLE public.settlement_members ADD COLUMN can_manage BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settlement_members' 
                   AND column_name = 'can_kick') THEN
        ALTER TABLE public.settlement_members ADD COLUMN can_kick BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 2: Migrate data back to old columns (only if new columns exist and have data)
-- Migrate storage back to has_access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'storage') THEN
        UPDATE public.settlement_members 
        SET has_access = storage 
        WHERE storage IS NOT NULL;
    END IF;
END $$;

-- Migrate build back to can_build
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'build') THEN
        UPDATE public.settlement_members 
        SET can_build = build 
        WHERE build IS NOT NULL;
    END IF;
END $$;

-- Migrate officer back to can_manage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'officer') THEN
        UPDATE public.settlement_members 
        SET can_manage = officer 
        WHERE officer IS NOT NULL;
    END IF;
END $$;

-- Migrate co_owner back to can_kick
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'co_owner') THEN
        UPDATE public.settlement_members 
        SET can_kick = co_owner 
        WHERE co_owner IS NOT NULL;
    END IF;
END $$;

-- Step 3: Rename player back to player_name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'player') THEN
        ALTER TABLE public.settlement_members RENAME COLUMN player TO player_name;
    END IF;
END $$;

-- Step 4: Update unique constraint back to player_name
DO $$
BEGIN
    -- Drop new constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'settlement_members_player_key') THEN
        ALTER TABLE public.settlement_members DROP CONSTRAINT settlement_members_player_key;
    END IF;
    
    -- Add old constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'settlement_members_player_name_key') THEN
        ALTER TABLE public.settlement_members ADD CONSTRAINT settlement_members_player_name_key UNIQUE(player_name);
    END IF;
END $$;

-- Step 5: Remove new permission columns (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'storage') THEN
        ALTER TABLE public.settlement_members DROP COLUMN storage;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'build') THEN
        ALTER TABLE public.settlement_members DROP COLUMN build;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'officer') THEN
        ALTER TABLE public.settlement_members DROP COLUMN officer;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'co_owner') THEN
        ALTER TABLE public.settlement_members DROP COLUMN co_owner;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'player_id') THEN
        ALTER TABLE public.settlement_members DROP COLUMN player_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'settlement_members' 
               AND column_name = 'entity_id') THEN
        ALTER TABLE public.settlement_members DROP COLUMN entity_id;
    END IF;
END $$;

-- Step 6: Verify rollback
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'settlement_members' 
ORDER BY ordinal_position;

-- Rollback completed!
