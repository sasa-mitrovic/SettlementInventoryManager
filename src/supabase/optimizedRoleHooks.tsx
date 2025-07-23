import {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabaseClient } from './supabaseClient';
import { UserWithRole, UserPermissions } from './supabase';
import { useAuth } from '../components/AuthProvider';

interface CachedUserData {
  user: User | null;
  profile: UserWithRole | null;
  permissions: UserPermissions;
  lastFetch: number;
}

interface PermissionContextType {
  cachedData: CachedUserData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  hasAnyPermission: (permissionNames: string[]) => boolean;
  hasAllPermissions: (permissionNames: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user } = useAuth();
  const [cachedData, setCachedData] = useState<CachedUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllUserData = useCallback(async () => {
    // Don't fetch if no user is authenticated
    if (!user) {
      setCachedData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if we're impersonating - if so, use the target user ID
      const isImpersonating =
        localStorage.getItem('impersonation_active') === 'true';
      const targetUserId = localStorage.getItem('impersonation_target_user');
      const effectiveUserId =
        isImpersonating && targetUserId ? targetUserId : user.id;

      console.log('PermissionProvider fetchAllUserData:', {
        authUserId: user.id,
        isImpersonating,
        targetUserId,
        effectiveUserId,
      });

      // Use a service role call to bypass RLS issues temporarily
      // Fetch permissions first (this should work)
      const permissionsResult = await supabaseClient.rpc(
        'get_user_permissions',
        { user_id: effectiveUserId },
      );

      if (permissionsResult.error) {
        throw new Error(
          `Permissions fetch error: ${permissionsResult.error.message}`,
        );
      }

      // Try to fetch profile using the secure function to avoid RLS issues
      const profileResult = await supabaseClient.rpc(
        'get_user_profile_with_role',
        { target_user_id: effectiveUserId }
      );

      // If profile fetch fails, handle the error
      let profileData;
      if (profileResult.error) {
        console.warn(
          'Profile fetch failed, using basic profile:',
          profileResult.error.message,
        );

        // During impersonation, we shouldn't fall back to admin data
        if (isImpersonating) {
          throw new Error(
            'Failed to fetch impersonated user profile. Please try again.',
          );
        }

        // Create a basic profile from the auth user data (only when not impersonating)
        profileData = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || '',
          in_game_name: user.user_metadata?.in_game_name || 'Player',
          is_active: true,
          role: {
            id: 'temp-super-admin',
            name: 'super_admin', // Assume super_admin for now
            description: 'Super administrator',
          },
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
          role_id: 'temp-super-admin',
        };
      } else {
        // The RPC function returns a single JSON object
        const profile = profileResult.data;
        if (profile) {
          profileData = {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            in_game_name: profile.in_game_name,
            is_active: profile.is_active,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            role_id: profile.role_id,
            role: profile.role_name ? {
              id: profile.role_id,
              name: profile.role_name,
              description: profile.role_description,
            } : null,
          };
        } else {
          throw new Error('User profile not found');
        }
      }

      // Convert permissions array to object for easier lookup
      const permissionsMap: UserPermissions = {};
      permissionsResult.data?.forEach(
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

      // Create effective user object for caching
      const effectiveUser =
        isImpersonating && targetUserId
          ? {
              ...user,
              id: targetUserId,
            }
          : user;

      const newCachedData: CachedUserData = {
        user: effectiveUser,
        profile: profileData as UserWithRole,
        permissions: permissionsMap,
        lastFetch: Date.now(),
      };

      setCachedData(newCachedData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch user data',
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refetch = useCallback(async () => {
    await fetchAllUserData();
  }, [fetchAllUserData]);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    if (!cachedData) return false;
    return Date.now() - cachedData.lastFetch < CACHE_DURATION;
  }, [cachedData]);

  // Auto-fetch on mount and when cache expires
  useEffect(() => {
    if (!isCacheValid()) {
      fetchAllUserData();
    }
  }, [fetchAllUserData, isCacheValid]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED'
      ) {
        fetchAllUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAllUserData]);

  // Listen for impersonation changes
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('Storage change detected, refetching user data');
      // Force refetch when impersonation status changes
      fetchAllUserData();
    };

    const handleImpersonationChange = (event: any) => {
      console.log('Impersonation change event detected:', event.detail);
      // Force refetch when impersonation changes (custom event for same window)
      fetchAllUserData();
    };

    // Listen for storage events (cross-tab) and custom events (same window)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('impersonation-changed', handleImpersonationChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(
        'impersonation-changed',
        handleImpersonationChange,
      );
    };
  }, [fetchAllUserData]);

  // Permission checking functions that use cached data
  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      if (!cachedData?.permissions) {
        console.log('No cached permissions data');
        return false;
      }
      const hasIt = permissionName in cachedData.permissions;
      const userId = cachedData?.user?.id;
      console.log(
        `Permission check for "${permissionName}": ${hasIt} (user: ${userId})`,
      );
      console.log(
        'Available permissions:',
        Object.keys(cachedData.permissions),
      );
      return hasIt;
    },
    [cachedData],
  );

  const hasAnyPermission = useCallback(
    (permissionNames: string[]): boolean => {
      if (!cachedData?.permissions) return false;
      return permissionNames.some(
        (permission) => permission in cachedData.permissions,
      );
    },
    [cachedData],
  );

  const hasAllPermissions = useCallback(
    (permissionNames: string[]): boolean => {
      if (!cachedData?.permissions) return false;
      return permissionNames.every(
        (permission) => permission in cachedData.permissions,
      );
    },
    [cachedData],
  );

  const contextValue: PermissionContextType = {
    cachedData,
    loading,
    error,
    refetch,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

// Custom hook to use the permission context
export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error(
      'usePermissionContext must be used within a PermissionProvider',
    );
  }
  return context;
}

// Optimized hooks that use cached data
export function useUserProfile() {
  const { cachedData, loading, error, refetch } = usePermissionContext();

  return {
    userProfile: cachedData?.profile || null,
    loading,
    error,
    refetch,
  };
}

export function useUserPermissions() {
  const { cachedData, loading, error, refetch } = usePermissionContext();

  return {
    permissions: cachedData?.permissions || {},
    loading,
    error,
    refetch,
  };
}

export function useHasPermission(permissionName: string) {
  const { hasPermission, loading } = usePermissionContext();

  return {
    hasPermission: hasPermission(permissionName),
    loading,
  };
}

export function useHasAnyPermission(permissionNames: string[]) {
  const { hasAnyPermission, loading } = usePermissionContext();

  return {
    hasAnyPermission: hasAnyPermission(permissionNames),
    loading,
  };
}

export function useHasAllPermissions(permissionNames: string[]) {
  const { hasAllPermissions, loading } = usePermissionContext();

  return {
    hasAllPermissions: hasAllPermissions(permissionNames),
    loading,
  };
}
