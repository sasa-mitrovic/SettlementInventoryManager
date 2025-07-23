-- Migration to add individual permission columns to settlement_members table
-- This aligns with the data structure from bitjita.com

-- First, rename player_name to player for consistency
ALTER TABLE public.settlement_members RENAME COLUMN player_name TO player;

-- Add individual permission columns
ALTER TABLE public.settlement_members 
ADD COLUMN IF NOT EXISTS storage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS build BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS officer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS co_owner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS player_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);

-- Update unique constraint to use 'player' instead of 'player_name'
ALTER TABLE public.settlement_members DROP CONSTRAINT IF EXISTS settlement_members_player_name_key;
ALTER TABLE public.settlement_members ADD CONSTRAINT settlement_members_player_key UNIQUE(player);

-- Add comment explaining the permission structure
COMMENT ON TABLE public.settlement_members IS 'Settlement member data scraped from bitjita.com with individual permission columns';
COMMENT ON COLUMN public.settlement_members.storage IS 'Storage/inventory permission (inventoryPermission)';
COMMENT ON COLUMN public.settlement_members.build IS 'Build permission (buildPermission)';
COMMENT ON COLUMN public.settlement_members.officer IS 'Officer permission (officerPermission)';
COMMENT ON COLUMN public.settlement_members.co_owner IS 'Co-owner permission (coOwnerPermission)';
