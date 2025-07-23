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
          setUser(initialSession?.user ?? null);
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
        setUser(newSession?.user ?? null);

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
