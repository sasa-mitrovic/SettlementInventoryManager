import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase';

// Create client with optimized auth settings for better session persistence
export const supabaseClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      // Enable automatic token refresh
      autoRefreshToken: true,
      // Persist session in localStorage (default behavior)
      persistSession: true,
      // Detect session from URL (for magic link auth, etc.)
      detectSessionInUrl: true,
      // Storage key for session data
      storageKey: 'supabase.auth.token',
      // Flow type for better mobile support
      flowType: 'pkce',
    },
    // Don't include realtime config to avoid loading WebSocket modules
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  },
);
