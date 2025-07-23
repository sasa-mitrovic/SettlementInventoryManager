import React from 'react';
import {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
} from '../supabase/optimizedRoleHooks';
import { Loader, Text } from '@mantine/core';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
  loading: customLoading,
}: PermissionGateProps) {
  // Single permission check
  const { hasPermission, loading: singleLoading } = useHasPermission(
    permission || '',
  );

  // Any permissions check
  const { hasAnyPermission, loading: anyLoading } = useHasAnyPermission(
    anyPermissions || [],
  );

  // All permissions check
  const { hasAllPermissions, loading: allLoading } = useHasAllPermissions(
    allPermissions || [],
  );

  // Determine which loading state to use
  const isLoading = permission
    ? singleLoading
    : anyPermissions
      ? anyLoading
      : allPermissions
        ? allLoading
        : false;

  // Show loading state
  if (isLoading) {
    return customLoading ? <>{customLoading}</> : <Loader size="sm" />;
  }

  // Determine if user has required permissions
  const hasRequiredPermission = permission
    ? hasPermission
    : anyPermissions
      ? hasAnyPermission
      : allPermissions
        ? hasAllPermissions
        : false;

  // Render children if user has permission, otherwise render fallback
  return hasRequiredPermission ? <>{children}</> : <>{fallback}</>;
}

interface RoleGateProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user roles
 */
export function RoleGate({
  children,
  roles,
  fallback = null,
  loading: customLoading,
}: RoleGateProps) {
  // This would require a role hook - we can implement this if needed
  // For now, we'll just return the children as this is less common than permission-based access
  return <>{children}</>;
}

interface ConditionalRenderProps {
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Simple conditional render component
 */
export function ConditionalRender({
  condition,
  children,
  fallback = null,
}: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component for permission-based access control
 */
export function withPermission<T extends {}>(
  Component: React.ComponentType<T>,
  permission: string,
  fallback?: React.ReactNode,
) {
  return function PermissionWrappedComponent(props: T) {
    return (
      <PermissionGate permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Higher-order component for multiple permission checks
 */
export function withAnyPermission<T extends {}>(
  Component: React.ComponentType<T>,
  permissions: string[],
  fallback?: React.ReactNode,
) {
  return function AnyPermissionWrappedComponent(props: T) {
    return (
      <PermissionGate anyPermissions={permissions} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Unauthorized access component
 */
export function UnauthorizedAccess() {
  return (
    <Text c="red" ta="center" mt="xl">
      You don't have permission to access this resource.
    </Text>
  );
}
