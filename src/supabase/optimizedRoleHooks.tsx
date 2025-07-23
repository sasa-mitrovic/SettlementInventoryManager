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

      // Fetch profile and permissions in parallel using the user from auth context
      const [profileResult, permissionsResult] = await Promise.all([
        supabaseClient
          .from('user_profiles')
          .select(
            `
            *,
            role:roles(*)
          `,
          )
          .eq('id', user.id)
          .single(),
        supabaseClient.rpc('get_user_permissions', { user_id: user.id }),
      ]);

      if (profileResult.error) {
        throw new Error(`Profile fetch error: ${profileResult.error.message}`);
      }

      if (permissionsResult.error) {
        throw new Error(
          `Permissions fetch error: ${permissionsResult.error.message}`,
        );
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

      const newCachedData: CachedUserData = {
        user,
        profile: profileResult.data as UserWithRole,
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

  // Permission checking functions that use cached data
  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      if (!cachedData?.permissions) return false;
      return permissionName in cachedData.permissions;
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
