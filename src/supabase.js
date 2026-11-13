
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith("https://") &&
  !supabaseKey.includes("YOUR_")
);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
