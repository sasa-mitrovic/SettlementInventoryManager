// Enhanced sign out utility function for production environments
// This can be used as a reference or alternative implementation

import { supabaseClient } from '../supabase/supabaseClient';
import { notifications } from '@mantine/notifications';

export const robustSignOut = async (navigate: (path: string) => void) => {
  try {
    // Step 1: Clear all local storage data first (this always works)
    const keysToRemove = [
      'impersonation_active',
      'impersonation_target_user',
      'impersonation_original_admin',
      'impersonating_user_id',
      'impersonating_user_email',
      'original_user_data',
      // Supabase auth keys (if any)
      'supabase.auth.token',
      'sb-auth-token',
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn(`Could not remove ${key}:`, e);
      }
    });

    // Step 2: Try to sign out from Supabase
    let supabaseSignOutSuccessful = false;
    try {
      const { error } = await supabaseClient.auth.signOut({
        scope: 'global', // Sign out from all devices
      });

      if (error) {
        console.warn('Supabase sign out error:', error);

        // Check if it's a benign error (session already gone)
        const isBenignError =
          error.message?.toLowerCase().includes('session') ||
          error.message?.toLowerCase().includes('missing') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('expired');

        if (isBenignError) {
          supabaseSignOutSuccessful = true;
        } else {
          console.error('Real Supabase sign out error:', error);
        }
      } else {
        supabaseSignOutSuccessful = true;
      }
    } catch (authError) {
      console.error('Exception during Supabase sign out:', authError);
      // Continue anyway - we've cleared local state
    }

    // Step 3: Show appropriate notification
    if (supabaseSignOutSuccessful) {
      notifications.show({
        title: 'Signed Out Successfully',
        message: 'You have been successfully signed out.',
        color: 'green',
      });
    } else {
      notifications.show({
        title: 'Signed Out Locally',
        message: 'Local session cleared. Redirecting to sign in...',
        color: 'blue',
      });
    }

    // Step 4: Navigate to auth page
    navigate('/auth');

    // Step 5: Force page reload to ensure clean state
    setTimeout(() => {
      try {
        window.location.href = '/auth'; // More forceful than reload
      } catch (e) {
        window.location.reload();
      }
    }, 1000);

    return true;
  } catch (error) {
    console.error('Critical error during sign out:', error);

    // Last resort: clear everything and redirect
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Could not clear storage:', e);
    }

    notifications.show({
      title: 'Session Cleared',
      message: 'Redirecting to sign in page...',
      color: 'orange',
    });

    // Force navigation even if there are errors
    try {
      navigate('/auth');
      setTimeout(() => (window.location.href = '/auth'), 500);
    } catch (e) {
      window.location.href = '/auth';
    }

    return false;
  }
};
