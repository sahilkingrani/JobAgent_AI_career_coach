import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { config } from "./config";

export const supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    flowType: "implicit",
    autoRefreshToken: true,
    persistSession: true,
  },
});