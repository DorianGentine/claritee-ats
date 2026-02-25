import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec clé service role (Admin API).
 * À utiliser UNIQUEMENT côté serveur (tRPC, API routes).
 * Ne jamais exposer SUPABASE_SECRET_KEY au client.
 */
export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for admin client"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
};
