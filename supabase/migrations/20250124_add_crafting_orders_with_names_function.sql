-- Add function to get crafting orders with user names
-- This function bypasses RLS to safely get display names for public use

-- Drop the existing function first to allow changing the return type
DROP FUNCTION IF EXISTS public.get_crafting_orders_with_names();

-- Create function to get crafting orders with user names
-- This function is SECURITY DEFINER to bypass RLS for user profile access
CREATE OR REPLACE FUNCTION public.get_crafting_orders_with_names()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    item_id TEXT,
    item_name TEXT,
    item_icon TEXT,
    item_tier TEXT,
    quantity INTEGER,
    sector TEXT,
    status TEXT,
    placed_by UUID,
    claimed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID,
    settlement_id TEXT,
    placed_by_name TEXT,
    claimed_by_name TEXT,
    completed_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.id,
        co.created_at,
        co.item_id::TEXT,
        co.item_name::TEXT,
        co.item_icon::TEXT,
        co.item_tier::TEXT,
        co.quantity,
        co.sector::TEXT,
        co.status::TEXT,
        co.placed_by,
        co.claimed_by,
        co.completed_at,
        co.completed_by,
        co.settlement_id::TEXT,
        -- Get display names for all user references, cast to TEXT to ensure type consistency
        COALESCE(placed_by_profile.in_game_name::TEXT, placed_by_profile.email::TEXT, 'Unknown User'::TEXT) as placed_by_name,
        COALESCE(claimed_by_profile.in_game_name::TEXT, claimed_by_profile.email::TEXT, 'Unknown User'::TEXT) as claimed_by_name,
        COALESCE(completed_by_profile.in_game_name::TEXT, completed_by_profile.email::TEXT, 'Unknown User'::TEXT) as completed_by_name
    FROM public.crafting_orders co
    LEFT JOIN public.user_profiles placed_by_profile ON co.placed_by = placed_by_profile.id
    LEFT JOIN public.user_profiles claimed_by_profile ON co.claimed_by = claimed_by_profile.id  
    LEFT JOIN public.user_profiles completed_by_profile ON co.completed_by = completed_by_profile.id
    ORDER BY co.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
