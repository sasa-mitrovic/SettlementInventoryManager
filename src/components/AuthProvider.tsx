import React, { useState, useEffect, useContext, createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseClient } from '../supabase/supabaseClient';
import { Loader, Center, Stack, Text } from '@mantine/core';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  initialized: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthProvider({ children, fallback }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Check for impersonation
  const checkImpersonation = (originalUser: User | null) => {
    const isImpersonating =
      localStorage.getItem('impersonation_active') === 'true';
    const targetUserId = localStorage.getItem('impersonation_target_user');

    if (isImpersonating && targetUserId && originalUser) {
      // Create a modified user object for impersonation
      return {
        ...originalUser,
        id: targetUserId,
        // Keep original user data but change the ID for context switching
      };
    }

    return originalUser;
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session (this checks localStorage for existing session)
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setSession(initialSession);
          const processedUser = checkImpersonation(
            initialSession?.user ?? null,
          );
          setUser(processedUser);
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.email);

      if (mounted) {
        setSession(newSession);
        const processedUser = checkImpersonation(newSession?.user ?? null);
        setUser(processedUser);

        // Clear impersonation on sign out
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('impersonation_active');
          localStorage.removeItem('impersonation_target_user');
          localStorage.removeItem('impersonation_original_admin');
        }

        // Only set loading to false after the initial session check
        if (!initialized) {
          setLoading(false);
          setInitialized(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  // Show loading state while checking for existing session
  if (loading && !initialized) {
    return (
      fallback || (
        <Center h="100vh">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">
              Loading...
            </Text>
          </Stack>
        </Center>
      )
    );
  }

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    initialized,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
