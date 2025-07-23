import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentUserProfile,
  getCurrentUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './roleUtils';
import { UserWithRole, UserPermissions } from './supabase';

/**
 * Hook to get current user profile with role information
 */
export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch user profile',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return {
    userProfile,
    loading,
    error,
    refetch: fetchUserProfile,
  };
}

/**
 * Hook to get current user permissions
 */
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userPermissions = await getCurrentUserPermissions();
      setPermissions(userPermissions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch permissions',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    refetch: fetchPermissions,
  };
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permissionName: string) {
  const [hasPermissionResult, setHasPermissionResult] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setLoading(true);
      const result = await hasPermission(permissionName);
      setHasPermissionResult(result);
      setLoading(false);
    };

    if (permissionName) {
      checkPermission();
    }
  }, [permissionName]);

  return { hasPermission: hasPermissionResult, loading };
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissionNames: string[]) {
  const [hasAnyPermissionResult, setHasAnyPermissionResult] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      setLoading(true);
      const result = await hasAnyPermission(permissionNames);
      setHasAnyPermissionResult(result);
      setLoading(false);
    };

    if (permissionNames.length > 0) {
      checkPermissions();
    }
  }, [permissionNames]);

  return { hasAnyPermission: hasAnyPermissionResult, loading };
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(permissionNames: string[]) {
  const [hasAllPermissionsResult, setHasAllPermissionsResult] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      setLoading(true);
      const result = await hasAllPermissions(permissionNames);
      setHasAllPermissionsResult(result);
      setLoading(false);
    };

    if (permissionNames.length > 0) {
      checkPermissions();
    }
  }, [permissionNames]);

  return { hasAllPermissions: hasAllPermissionsResult, loading };
}
