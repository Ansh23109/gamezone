import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Always create a new one per request (per Supabase's own guidance) — never
 * share this across requests. Writing cookies from a Server Component itself
 * is a no-op (Next.js only allows cookie writes from a Server Action/Route
 * Handler or proxy.ts); session refresh is handled by proxy.ts instead, so
 * that's expected here, not a bug.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — expected, proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
