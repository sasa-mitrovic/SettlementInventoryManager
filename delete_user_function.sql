-- Function to safely delete a user from both user_profiles and auth.users
-- This should be created in your Supabase SQL editor

CREATE OR REPLACE FUNCTION delete_user_completely(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
BEGIN
  -- Get the current user's role
  SELECT r.name INTO current_user_role
  FROM user_profiles up
  JOIN roles r ON up.role_id = r.id
  WHERE up.id = auth.uid();
  
  -- Get the target user's role
  SELECT r.name INTO target_user_role
  FROM user_profiles up
  LEFT JOIN roles r ON up.role_id = r.id
  WHERE up.id = user_id_to_delete;
  
  -- Security checks
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No role assigned';
  END IF;
  
  -- Super admin cannot be deleted by anyone
  IF target_user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot delete super admin users';
  END IF;
  
  -- Super admin can delete anyone (except other super admins)
  IF current_user_role = 'super_admin' THEN
    -- Allow deletion
    NULL;
  -- Admin can delete users without admin/super_admin roles
  ELSIF current_user_role = 'admin' THEN
    IF target_user_role IN ('admin', 'super_admin') THEN
      RAISE EXCEPTION 'Admins cannot delete other admins or super admins';
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to delete users';
  END IF;
  
  -- Cannot delete yourself
  IF user_id_to_delete = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Delete from user_profiles first (due to foreign key constraints)
  DELETE FROM user_profiles WHERE id = user_id_to_delete;
  
  -- Delete from auth.users (requires admin privileges)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;
