"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser-only Supabase client — use from Client Components (e.g. the login form). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
