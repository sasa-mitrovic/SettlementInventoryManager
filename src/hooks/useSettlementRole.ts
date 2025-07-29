import { useState, useEffect } from 'react';
import { supabaseClient } from '../supabase/supabaseClient';
import { useAuth } from '../components/AuthProvider';
import { useSettlement } from '../contexts/SettlementContext_simple';

interface UseSettlementRoleResult {
  roleName: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get user's role for the current settlement using the database function
 */
export function useSettlementRole(): UseSettlementRoleResult {
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentSettlement } = useSettlement();

  useEffect(() => {
    const fetchSettlementRole = async () => {
      if (!user?.id || !currentSettlement?.entityId) {
        setRoleName(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(
          '🔍 [SettlementRole] Fetching role for user:',
          user.id,
          'in settlement:',
          currentSettlement.entityId,
        );

        const params = {
          auth_id: user.id,
          settlement_id: currentSettlement.entityId,
        };

        const { data, error: rpcError } = await supabaseClient.rpc(
          'get_user_settlement_role',
          params,
        );

        console.log('data from get_user_settlement_role:', data);
        if (rpcError) {
          console.error('Error fetching settlement role:', rpcError);
          setError(rpcError.message);
          setRoleName(null);
        } else {
          // The function returns a table with role, get the first result
          const role = data && data.length > 0 ? data[0].role_name : null;
          setRoleName(role);
        }
      } catch (err) {
        console.error('Failed to fetch settlement role:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setRoleName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSettlementRole();
  }, [user?.id, currentSettlement?.entityId]);

  return { roleName, loading, error };
}

/**
 * Hook to check if user has a specific settlement role
 */
export function useHasSettlementRole(requiredRole: string): {
  hasRole: boolean;
  loading: boolean;
  error: string | null;
} {
  const { roleName, loading, error } = useSettlementRole();

  const hasRole = roleName === requiredRole;

  return { hasRole, loading, error };
}

/**
 * Hook to check if user has any of the specified settlement roles
 */
export function useHasAnySettlementRole(requiredRoles: string[]): {
  hasAnyRole: boolean;
  loading: boolean;
  error: string | null;
} {
  const { roleName, loading, error } = useSettlementRole();

  const hasAnyRole = roleName ? requiredRoles.includes(roleName) : false;

  return { hasAnyRole, loading, error };
}
