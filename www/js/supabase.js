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

// -- Auth helper: get the currently signed-in user (or null)
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? session.user : null;
}