import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else {
  console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_ANON_KEY is not defined in environment variables.');
}

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else if (supabase) {
  // Fall back to standard client if service role key is not provided
  supabaseAdmin = supabase;
}

export const isSupabaseConfigured = () => {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
};

export const getSupabaseClient = () => {
  if (!supabase) {
    const error = new Error('Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.');
    error.statusCode = 500;
    throw error;
  }
  return supabase;
};

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    return getSupabaseClient();
  }
  return supabaseAdmin;
};

export { supabase, supabaseAdmin };
export default supabase;
