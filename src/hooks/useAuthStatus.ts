import { useAuth } from '../components/AuthProvider';

/**
 * Hook to check if user is authenticated
 * Returns both authentication status and loading state
 */
export function useAuthStatus() {
  const { user, loading, initialized } = useAuth();

  return {
    isAuthenticated: !!user,
    user,
    loading,
    initialized,
  };
}

/**
 * Hook that requires authentication
 * Throws an error if used when user is not authenticated
 */
export function useRequireAuth() {
  const { user, loading, initialized } = useAuth();

  if (!loading && initialized && !user) {
    throw new Error('Authentication required');
  }

  return {
    user: user!,
    loading,
  };
}
