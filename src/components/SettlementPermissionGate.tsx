import React from 'react';
import { Loader, Text } from '@mantine/core';
import {
  useHasSettlementRole,
  useHasAnySettlementRole,
} from '../hooks/useSettlementRole';

interface SettlementPermissionGateProps {
  children: React.ReactNode;
  role?: string;
  anyRoles?: string[];
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user's settlement role
 * Uses the get_user_settlement_role database function
 */
export function SettlementPermissionGate({
  children,
  role,
  anyRoles,
  fallback = null,
  loading: customLoading,
}: SettlementPermissionGateProps) {
  // Single role check
  const { hasRole, loading: singleLoading } = useHasSettlementRole(role || '');

  // Any roles check
  const { hasAnyRole, loading: anyLoading } = useHasAnySettlementRole(
    anyRoles || [],
  );

  // Determine which loading state to use
  const isLoading = role ? singleLoading : anyRoles ? anyLoading : false;

  // Show loading state
  if (isLoading) {
    return customLoading ? <>{customLoading}</> : <Loader size="sm" />;
  }

  // Determine if user has required role
  const hasRequiredRole = role ? hasRole : anyRoles ? hasAnyRole : false;

  // Render children if user has role, otherwise render fallback
  return hasRequiredRole ? <>{children}</> : <>{fallback}</>;
}

/**
 * Settlement-aware unauthorized access component
 */
export function SettlementUnauthorizedAccess() {
  return (
    <Text c="red" ta="center" mt="xl">
      You don't have permission to access this resource for the current
      settlement.
    </Text>
  );
}

/**
 * Higher-order component for settlement role-based access control
 */
export function withSettlementRole<T extends {}>(
  Component: React.ComponentType<T>,
  role: string,
  fallback?: React.ReactNode,
) {
  return function SettlementRoleWrappedComponent(props: T) {
    return (
      <SettlementPermissionGate role={role} fallback={fallback}>
        <Component {...props} />
      </SettlementPermissionGate>
    );
  };
}

/**
 * Higher-order component for multiple settlement role checks
 */
export function withAnySettlementRole<T extends {}>(
  Component: React.ComponentType<T>,
  roles: string[],
  fallback?: React.ReactNode,
) {
  return function AnySettlementRoleWrappedComponent(props: T) {
    return (
      <SettlementPermissionGate anyRoles={roles} fallback={fallback}>
        <Component {...props} />
      </SettlementPermissionGate>
    );
  };
}
