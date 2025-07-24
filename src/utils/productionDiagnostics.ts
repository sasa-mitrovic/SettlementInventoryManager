// Production environment diagnostics
// Run this in console to debug production auth issues

export const diagnoseProductionAuth = async () => {
  console.log('=== Production Auth Diagnostics ===');

  // Environment info
  console.log('Environment:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    isLocalhost:
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1',
    userAgent: navigator.userAgent,
    cookiesEnabled: navigator.cookieEnabled,
  });

  // Supabase config check
  try {
    const { supabaseClient } = await import('../supabase/supabaseClient');
    console.log('Supabase client available:', !!supabaseClient);

    // Check auth state
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session,
      sessionError,
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at,
          }
        : null,
    });

    // Check user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    console.log('Current user:', {
      hasUser: !!user,
      userError,
      userId: user?.id,
      userEmail: user?.email,
    });
  } catch (supabaseError) {
    console.error('Supabase client error:', supabaseError);
  }

  // Local storage check
  console.log('Local Storage Keys:', Object.keys(localStorage));
  console.log('Session Storage Keys:', Object.keys(sessionStorage));

  // Impersonation state
  const impersonationKeys = [
    'impersonation_active',
    'impersonation_target_user',
    'impersonation_original_admin',
    'impersonating_user_id',
    'impersonating_user_email',
    'original_user_data',
  ];

  const impersonationState: Record<string, string | null> = {};
  impersonationKeys.forEach((key) => {
    impersonationState[key] = localStorage.getItem(key);
  });

  console.log('Impersonation State:', impersonationState);

  // Network connectivity
  console.log('Network:', {
    online: navigator.onLine,
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  });

  console.log('=== End Diagnostics ===');
};

// Function to test sign out in production
export const testProductionSignOut = async () => {
  console.log('=== Testing Production Sign Out ===');

  try {
    const { supabaseClient } = await import('../supabase/supabaseClient');

    // Test 1: Check current session
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();
    console.log('Pre-signout session check:', {
      hasSession: !!session,
      error: sessionError,
    });

    // Test 2: Attempt sign out
    const { error: signOutError } = await supabaseClient.auth.signOut();
    console.log('Sign out result:', { error: signOutError });

    // Test 3: Verify session is gone
    const {
      data: { session: postSession },
      error: postSessionError,
    } = await supabaseClient.auth.getSession();
    console.log('Post-signout session check:', {
      hasSession: !!postSession,
      error: postSessionError,
    });

    return !signOutError;
  } catch (error) {
    console.error('Test sign out failed:', error);
    return false;
  }
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).diagnoseProductionAuth = diagnoseProductionAuth;
  (window as any).testProductionSignOut = testProductionSignOut;
}
