import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://yatwxxfrmrwfhflmjanl.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_JSaSGJPrr2lgJfzGc-_B6w_2Q1IL5rc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);