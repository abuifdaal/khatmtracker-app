// lib/supabaseServer.ts
// SERVER-ONLY client using the SERVICE ROLE key.
// ⚠️ Do NOT import this in client components. Keep it in API routes or server components only.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceRole) {
  // Helpful error if env variables are missing
  console.warn("Missing Supabase server env vars");
}

export const supabaseServer = createClient(url, serviceRole, {
  auth: { persistSession: false },
  global: { headers: { "X-Client-Info": "khatmtracker-server" } },
});