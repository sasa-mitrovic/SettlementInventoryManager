import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please check your .env file in the env/ directory.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please check your .env file in the env/ directory.');
}

// Create client with optimized auth settings for better session persistence
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
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
