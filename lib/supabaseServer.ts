// lib/supabaseServer.ts
// SERVER-ONLY Supabase client (uses the SERVICE ROLE key).
// Do NOT import this in client components.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(url, serviceRole, {
  auth: { persistSession: false },
  global: { headers: { "X-Client-Info": "khatmtracker-server" } },
});