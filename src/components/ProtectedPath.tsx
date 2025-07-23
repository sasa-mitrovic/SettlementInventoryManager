import { User } from '@supabase/supabase-js';
import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedPathProps extends PropsWithChildren {
  redirectUrl: string;
  shouldRedirect?: (arg0: User | null) => boolean;
}

export const ProtectedPath = ({
  children,
  redirectUrl,
  shouldRedirect,
}: ProtectedPathProps) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return null; // Or a loading component
  }

  if (shouldRedirect ? shouldRedirect(user) : user == null) {
    return <Navigate to={redirectUrl} />;
  }

  return <>{children}</>;
};
