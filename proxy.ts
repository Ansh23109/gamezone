import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { resolveHostMode, getTenantBySlug } from "@/lib/tenant/resolve";

// Next.js 16 renamed middleware.ts -> proxy.ts (export name `proxy`, Node.js
// runtime by default — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// This is the ONLY gate at this layer; every Server Action and query must
// still re-verify auth/tenant itself (lib/auth/session.ts) per Next's own
// docs warning that a proxy matcher exclusion also skips Server Function
// calls on that path, not just page requests.
export async function proxy(request: NextRequest) {
  const hostMode = resolveHostMode(request.headers.get("host"));

  if (hostMode.kind === "marketing") {
    // Apex domain / unrecognized host — not a tenant or admin console.
    // TODO: swap for a real marketing page once one exists.
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && !!data;
  const appMetadata = (data?.claims.app_metadata ?? {}) as { role?: string; tenantId?: string };

  response.headers.set("x-host-mode", hostMode.kind);

  if (hostMode.kind === "admin") {
    const isOwner = isAuthenticated && appMetadata.role === "OWNER";
    if (isPublicAuthPath(request.nextUrl.pathname)) {
      // Already signed in as OWNER -> skip straight past /login. Otherwise
      // let these render — redirecting /login (or /accept-invite, reached
      // pre-auth from an invite email link) back to /login would loop.
      if (isOwner && request.nextUrl.pathname.startsWith("/login")) {
        return redirectTo(request, "/admin", response);
      }
      return response;
    }
    if (!isOwner) {
      return redirectTo(request, "/login", response);
    }
    return response;
  }

  // hostMode.kind === "tenant"
  const tenant = await getTenantBySlug(hostMode.slug);
  if (!tenant) {
    return new NextResponse("Unknown site", { status: 404 });
  }
  if (tenant.status === "SUSPENDED") {
    return new NextResponse("This console is currently unavailable. Contact support.", { status: 503 });
  }

  response.headers.set("x-tenant-id", tenant.id);
  response.headers.set("x-tenant-slug", tenant.slug);

  // OWNER does NOT get a bypass onto tenant consoles: OWNER has no tenant
  // `users` row (lib/tenant/context.ts), so requireTenantUser() — which
  // every tenant page/action calls — always rejects it regardless of what
  // proxy lets through. OWNER's only surface is /admin; impersonating a
  // tenant isn't supported in v1, so a tenant subdomain is gated purely on
  // sessionMatchesTenant here, keeping proxy and the Server-Action-level
  // guards consistent with each other.
  const sessionMatchesTenant = isAuthenticated && appMetadata.tenantId === tenant.id;

  if (isPublicAuthPath(request.nextUrl.pathname)) {
    // Already signed in for this tenant -> skip straight past /login. Leave
    // /accept-invite reachable regardless (the invite-email link lands here
    // pre-auth; the Supabase session tokens are in the URL hash, which never
    // reaches the server, so there's nothing to check here yet).
    if (sessionMatchesTenant && request.nextUrl.pathname.startsWith("/login")) {
      return redirectTo(request, "/", response);
    }
    return response;
  }

  if (!sessionMatchesTenant) {
    return redirectTo(request, "/login", response);
  }

  return response;
}

/** Paths reachable without an existing session: the login form itself, and
 * the invite-acceptance page an invite email links to (which establishes
 * its own session client-side from the URL hash — see
 * components/auth/accept-invite-form.tsx). */
function isPublicAuthPath(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/accept-invite");
}

function redirectTo(request: NextRequest, path: string, base: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  // Carry over any refreshed session cookies from the base response.
  for (const cookie of base.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     * - /api/webhooks/* (unauthenticated third parties, verified by their own signature)
     * - Next.js internals and static assets
     * - /brands/* logo files served from public/
     */
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico|brands/).*)",
  ],
};
