import { User } from '@supabase/supabase-js';
import { atom } from 'nanostores';
import { supabaseClient } from '../supabase/supabaseClient';

export const $currUser = atom<User | null>(null);

// Initialize with current session
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  $currUser.set(session?.user || null);
});

supabaseClient.auth.onAuthStateChange((_authChangeEvent, session) => {
  $currUser.set(session?.user || null);
  // Removed notification toast as it was showing on every token refresh
});
