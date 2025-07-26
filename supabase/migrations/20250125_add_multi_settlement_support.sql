-- Add multi-settlement support to the database
-- This migration adds settlement_id columns to relevant tables

-- Step 1: Add settlement_id to settlement_inventory table
ALTER TABLE public.settlement_inventory 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(100);

-- Step 2: Add settlement_id to crafting_orders table 
ALTER TABLE public.crafting_orders 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(100);

-- Step 3: Add settlement_id to inventory_targets table
ALTER TABLE public.inventory_targets 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(100);

-- Step 4: Add settlement_id to settlement_members table (if it exists)
ALTER TABLE public.settlement_members 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(100);

-- Step 5: Add settlement_id to settlement_skills table (if it exists)
ALTER TABLE public.settlement_skills 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(100);

-- Step 6: Set default settlement_id for existing data (Gloomhaven)
-- This ensures existing data continues to work
UPDATE public.settlement_inventory 
SET settlement_id = '144115188105096768' 
WHERE settlement_id IS NULL;

UPDATE public.crafting_orders 
SET settlement_id = '144115188105096768' 
WHERE settlement_id IS NULL;

UPDATE public.inventory_targets 
SET settlement_id = '144115188105096768' 
WHERE settlement_id IS NULL;

UPDATE public.settlement_members 
SET settlement_id = '144115188105096768' 
WHERE settlement_id IS NULL;

UPDATE public.settlement_skills 
SET settlement_id = '144115188105096768' 
WHERE settlement_id IS NULL;

-- Step 7: Add indexes for better performance
CREATE INDEX IF NOT EXISTS settlement_inventory_settlement_id_idx 
ON public.settlement_inventory (settlement_id);

CREATE INDEX IF NOT EXISTS crafting_orders_settlement_id_idx 
ON public.crafting_orders (settlement_id);

CREATE INDEX IF NOT EXISTS inventory_targets_settlement_id_idx 
ON public.inventory_targets (settlement_id);

CREATE INDEX IF NOT EXISTS settlement_members_settlement_id_idx 
ON public.settlement_members (settlement_id);

CREATE INDEX IF NOT EXISTS settlement_skills_settlement_id_idx 
ON public.settlement_skills (settlement_id);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.settlement_inventory.settlement_id 
IS 'Bitjita settlement entity ID - links inventory to specific settlement';

COMMENT ON COLUMN public.crafting_orders.settlement_id 
IS 'Bitjita settlement entity ID - links crafting orders to specific settlement';

COMMENT ON COLUMN public.inventory_targets.settlement_id 
IS 'Bitjita settlement entity ID - links inventory targets to specific settlement';

COMMENT ON COLUMN public.settlement_members.settlement_id 
IS 'Bitjita settlement entity ID - links members to specific settlement';

COMMENT ON COLUMN public.settlement_skills.settlement_id 
IS 'Bitjita settlement entity ID - links skills to specific settlement';

-- Step 9: Update unique constraints to include settlement_id
-- Remove old unique constraint and add new one with settlement_id
ALTER TABLE public.settlement_inventory 
DROP CONSTRAINT IF EXISTS settlement_inventory_item_name_container_name_key;

ALTER TABLE public.settlement_inventory 
ADD CONSTRAINT settlement_inventory_settlement_item_container_unique 
UNIQUE (settlement_id, item_name, container_name);

-- Update inventory targets unique constraint
ALTER TABLE public.inventory_targets 
DROP CONSTRAINT IF EXISTS inventory_targets_item_name_key;

ALTER TABLE public.inventory_targets 
ADD CONSTRAINT inventory_targets_settlement_item_unique 
UNIQUE (settlement_id, item_name);

-- Update settlement members unique constraint if it exists
ALTER TABLE public.settlement_members 
DROP CONSTRAINT IF EXISTS settlement_members_player_key;

ALTER TABLE public.settlement_members 
ADD CONSTRAINT settlement_members_settlement_player_unique 
UNIQUE (settlement_id, player);
