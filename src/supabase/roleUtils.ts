import { supabaseClient } from './supabaseClient';
import {
  UserProfile,
  UserWithRole,
  Permission,
  Role,
  UserPermissions,
} from './supabase';

/**
 * Get the current user's profile with role information
 */
export async function getCurrentUserProfile(): Promise<UserWithRole | null> {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return null;

    const { data: profile, error } = await supabaseClient
      .from('user_profiles')
      .select(
        `
        *,
        role:roles(*)
      `,
      )
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    console.log('🔍 Raw profile from database:', profile);
    console.log('🔍 Profile bitjita_user_id:', profile.bitjita_user_id);
    return profile as UserWithRole;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Get all permissions for the current user
 */
export async function getCurrentUserPermissions(): Promise<UserPermissions> {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return {};

    const { data: permissions, error } = await supabaseClient.rpc(
      'get_user_permissions',
      { user_id: user.id },
    );

    if (error) {
      console.error('Error fetching user permissions:', error);
      return {};
    }

    // Convert array to object for easier lookup
    const permissionsMap: UserPermissions = {};
    permissions?.forEach(
      (permission: {
        permission_name: string;
        resource: string;
        action: string;
      }) => {
        permissionsMap[permission.permission_name] = {
          resource: permission.resource,
          action: permission.action,
        };
      },
    );

    return permissionsMap;
  } catch (error) {
    console.error('Error in getCurrentUserPermissions:', error);
    return {};
  }
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(permissionName: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return false;

    const { data: hasPermission, error } = await supabaseClient.rpc(
      'user_has_permission',
      {
        user_id: user.id,
        permission_name: permissionName,
      },
    );

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return hasPermission || false;
  } catch (error) {
    console.error('Error in hasPermission:', error);
    return false;
  }
}

/**
 * Check if the current user has any of the specified permissions
 */
export async function hasAnyPermission(
  permissionNames: string[],
): Promise<boolean> {
  const permissions = await getCurrentUserPermissions();
  return permissionNames.some((permission) => permissions[permission]);
}

/**
 * Check if the current user has all of the specified permissions
 */
export async function hasAllPermissions(
  permissionNames: string[],
): Promise<boolean> {
  const permissions = await getCurrentUserPermissions();
  return permissionNames.every((permission) => permissions[permission]);
}

/**
 * Get all available roles
 */
export async function getRoles(): Promise<Role[]> {
  try {
    const { data: roles, error } = await supabaseClient
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return roles || [];
  } catch (error) {
    console.error('Error in getRoles:', error);
    return [];
  }
}

/**
 * Get all available permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  try {
    const { data: permissions, error } = await supabaseClient
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }

    return permissions || [];
  } catch (error) {
    console.error('Error in getPermissions:', error);
    return [];
  }
}

/**
 * Update a user's role (requires 'users.manage_roles' permission)
 * Now uses settlement_roles instead of user_profiles.role_id
 */
export async function updateUserRole(
  userId: string,
  roleId: string,
  settlementId?: string,
): Promise<boolean> {
  try {
    // Use the RPC function to update role in settlement_roles
    const { data, error } = await supabaseClient.rpc('update_user_role', {
      target_user_id: userId,
      new_role_id: roleId,
      p_settlement_id: settlementId || null,
    });

    if (error) {
      console.error('Error updating user role:', error);
      return false;
    }

    return data?.success ?? false;
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return false;
  }
}

/**
 * Get all users with their roles (requires 'users.read' permission)
 * Now uses get_all_users_for_admin RPC which gets roles from settlement_roles
 */
export async function getUsersWithRoles(): Promise<UserWithRole[]> {
  try {
    // Get current user ID for the admin function
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return [];
    }

    const { data: users, error } = await supabaseClient.rpc(
      'get_all_users_for_admin',
      { requesting_user_id: user.id },
    );

    if (error) {
      console.error('Error fetching users with roles:', error);
      return [];
    }

    // Transform the data to match UserWithRole interface
    return (users || []).map((userData: any) => ({
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      in_game_name: userData.in_game_name,
      is_active: userData.is_active,
      created_at: userData.created_at,
      updated_at: null,
      role: userData.role_name
        ? {
            id: userData.role_id,
            name: userData.role_name,
            description: userData.role_description,
          }
        : null,
    })) as UserWithRole[];
  } catch (error) {
    console.error('Error in getUsersWithRoles:', error);
    return [];
  }
}

/**
 * Create a new user profile (usually called after user signup)
 * Note: role is no longer set here - it's managed via settlement_roles
 */
export async function createUserProfile(
  userId: string,
  email: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseClient.from('user_profiles').insert({
      id: userId,
      email,
    });

    if (error) {
      console.error('Error creating user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    return false;
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return false;
  }
}
