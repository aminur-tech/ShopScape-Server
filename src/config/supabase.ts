import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client - server-side only, never exposed to the frontend.
// Used for uploading banner/product images and payment-proof screenshots
// to Supabase Storage.
export const supabaseAdmin =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
