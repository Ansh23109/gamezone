import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS and can call the Auth Admin
 * API (inviteUserByEmail, updateUserById for app_metadata, etc).
 *
 * NEVER import this from a Client Component or anywhere that could reach the
 * browser bundle — the "server-only" import above makes that a build error,
 * not just a runtime mistake, but keep this file's usage confined to
 * lib/actions/*.ts (Server Actions) and Route Handlers regardless.
 */
export function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
