import { createClient } from "@supabase/supabase-js";

export function supabasePublicServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("SUPABASE_URL missing");
  if (!key) throw new Error("SUPABASE_ANON_KEY missing");

  return createClient(url, key, { auth: { persistSession: false } });
}
