// ============================================================
// supabase.js - Supabase client configuration
// This file initializes the Supabase connection used across
// all modules (habits, tasks, journal, goals, finance).
// Update SUPABASE_URL and SUPABASE_KEY if project changes.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// -- Project credentials (keep these safe, do not share secret key)
const SUPABASE_URL = 'https://teppimpaunucbwingqac.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a1ozZ46y55IgOYSlU7RrZg_fuK4G2Qb';

// -- Initialize and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// -- Test connection (remove after confirming it works)
supabase.from('profiles').select('*').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection failed:', error.message);
  } else {
    console.log('Supabase connected successfully.');
  }
});