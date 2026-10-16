
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Real-time features will be disabled.');
}


let supabaseClient = null;
console.log('Supabase env check:', { supabaseUrl, supabaseAnonKey });
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn('Supabase URL or Anon Key is missing');
  }
} catch (e) {
  console.error('Failed to initialize Supabase:', e);
}
export const supabase = supabaseClient;
