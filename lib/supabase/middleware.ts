import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase client bound to proxy.ts's request/response cookies — the only
 * place that may actually refresh and persist a new session cookie (reads
 * from `request`, writes onto `response` so the refreshed cookie reaches
 * both this response and every downstream Server Component via `headers()`).
 * Returns the response so proxy.ts can keep building on it.
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          // Deliberately no `domain` option — a host-only cookie means
          // ppp.edgeweb.co's session is never sent to clientb.edgeweb.co,
          // a free structural isolation layer on top of the app_metadata
          // tenantId check below. Do not add a wildcard domain here.
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return { supabase, response };
}
