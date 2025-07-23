import { notifications } from '@mantine/notifications';
import { supabaseClient } from './supabaseClient';
import { redirect } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { UserWithRole } from './supabase';
import { getCurrentUserProfile } from './roleUtils';
import { usePermissionContext } from './optimizedRoleHooks';

export async function protectedPathLoader() {
  const user = await supabaseClient.auth.getUser();
  if (user.error) {
    notifications.show({
      title: user.error.name,
      message: user.error.message,
      color: 'red',
    });
    return null;
  }

  if (!user.data.user) {
    redirect('/auth');
  }
  return null;
}

export const useUser = () => {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabaseClient.auth.getUser().then((user) => {
      setUser(user.data?.user || undefined);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
      }
      if (event === 'SIGNED_OUT') {
        setUser(undefined);
      }
      setLoading(false);
    });
  }, []);

  return { user, loading };
};

/**
 * Enhanced hook that includes user profile and role information
 */
export const useUserWithProfile = () => {
  const [user, setUser] = useState<User>();
  const [userProfile, setUserProfile] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (_currentUser: User) => {
    try {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    supabaseClient.auth.getUser().then(async (userResponse) => {
      const currentUser = userResponse.data?.user;
      setUser(currentUser || undefined);

      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });
  }, []);

  useEffect(() => {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user);
      }
      if (event === 'SIGNED_OUT') {
        setUser(undefined);
        setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return {
    user,
    userProfile,
    loading,
    refetchProfile: () => (user ? fetchUserProfile(user) : Promise.resolve()),
  };
};

/**
 * Optimized hook that uses cached permission data
 */
export const useOptimizedUser = () => {
  const { cachedData, loading } = usePermissionContext();

  return {
    user: cachedData?.user || null,
    loading,
  };
};

/**
 * Optimized hook that uses cached profile data
 */
export const useOptimizedUserWithProfile = () => {
  const { cachedData, loading, refetch } = usePermissionContext();

  return {
    user: cachedData?.user || null,
    userProfile: cachedData?.profile || null,
    loading,
    refetchProfile: refetch,
  };
};
