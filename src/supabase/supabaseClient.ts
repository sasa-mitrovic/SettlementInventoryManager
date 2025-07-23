import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase';

// Create client without realtime to avoid WebSocket issues
export const supabaseClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    // Don't include realtime config to avoid loading WebSocket modules
  },
);
