-- Migration: Add admin functions for user impersonation
-- Date: 2025-01-26
-- Description: Creates admin functions that bypass RLS for user impersonation

-- Create function to get user profile for admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_profile_for_admin(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  in_game_name TEXT,
  bitjita_user_id TEXT,
  empire_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_signup BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return the target user's profile (bypasses RLS due to SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.in_game_name,
    up.bitjita_user_id,
    up.bitjita_empire_id,
    up.created_at,
    up.updated_at,
    up.completed_signup
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile_for_admin(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_profile_for_admin(UUID) IS 
'Function to get any user profile bypassing RLS. Used for user impersonation.';
