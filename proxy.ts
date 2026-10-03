import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { resolveHostMode, getTenantBySlug } from "@/lib/tenant/resolve";
import { TENANT_AUTH_DISABLED } from "@/lib/tenant/dev-flags";

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

  const { supabase, response: supabaseResponse } = createMiddlewareClient(request);
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && !!data;
  const appMetadata = (data?.claims.app_metadata ?? {}) as { role?: string; tenantId?: string };

  // x-host-mode/x-tenant-id/x-tenant-slug are how downstream Server
  // Components (lib/tenant/context.ts's getTenantContext) learn which
  // tenant/host resolved here, without a second DB lookup. Per Next's own
  // docs (01-app/03-api-reference/03-file-conventions/proxy.md, "Setting
  // Headers" section): these MUST be set via `request.headers` and passed
  // through `NextResponse.next({ request: { headers } })` — setting them on
  // `response.headers` instead (what this file did originally) only sends
  // them back to the *browser*, never forwards them to the render. That bug
  // caused intermittent "Not authenticated" errors in production (some
  // request shapes apparently got the request-header treatment anyway,
  // explaining why it mostly appeared to work) — `continueWith()` below is
  // now the one path that builds a "keep rendering" response, so this can't
  // regress silently in one branch while looking fixed in another.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-host-mode", hostMode.kind);

  function continueWith(extraHeaders?: Record<string, string>) {
    for (const [key, value] of Object.entries(extraHeaders ?? {})) {
      requestHeaders.set(key, value);
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    // Carry over any session cookies Supabase refreshed on supabaseResponse.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      res.cookies.set(cookie);
    }
    return res;
  }

  if (hostMode.kind === "admin") {
    const isOwner = isAuthenticated && appMetadata.role === "OWNER";
    if (isPublicAuthPath(request.nextUrl.pathname)) {
      // Already signed in as OWNER -> skip straight past /login. Otherwise
      // let these render — redirecting /login (or /accept-invite, reached
      // pre-auth from an invite email link) back to /login would loop.
      if (isOwner && request.nextUrl.pathname.startsWith("/login")) {
        return redirectTo(request, "/admin", supabaseResponse);
      }
      return continueWith();
    }
    if (!isOwner) {
      return redirectTo(request, "/login", supabaseResponse);
    }
    // Admin host only ever serves /admin/* (plus the public auth paths
    // above) — anything else (bare "/", or a tenant-only path like
    // /bookings) would otherwise fall through to app/(tenant)/page.tsx's
    // requireTenantUser(), which always throws for OWNER (no tenant `users`
    // row, by design — see the comment below).
    if (!request.nextUrl.pathname.startsWith("/admin")) {
      return redirectTo(request, "/admin", supabaseResponse);
    }
    return continueWith();
  }

  // hostMode.kind === "tenant"
  const tenant = await getTenantBySlug(hostMode.slug);
  if (!tenant) {
    return new NextResponse("Unknown site", { status: 404 });
  }
  if (tenant.status === "SUSPENDED") {
    return new NextResponse("This console is currently unavailable. Contact support.", { status: 503 });
  }

  const tenantHeaders = { "x-tenant-id": tenant.id, "x-tenant-slug": tenant.slug };

  // TEMPORARY, at the user's explicit request ("remove auth for now,
  // directly accessible") — skips the login requirement for every tenant
  // subdomain. admin.edgeweb.co is NOT affected; that console still
  // requires a real OWNER session regardless of this flag. See
  // lib/tenant/dev-flags.ts for how to turn this back on.
  if (TENANT_AUTH_DISABLED) {
    return continueWith(tenantHeaders);
  }

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
      return redirectTo(request, "/", supabaseResponse);
    }
    return continueWith(tenantHeaders);
  }

  if (!sessionMatchesTenant) {
    return redirectTo(request, "/login", supabaseResponse);
  }

  return continueWith(tenantHeaders);
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
     * - PWA assets (icon, apple-icon, manifest, pwa-icon-192/512, sw.js) —
     *   must be fetchable by the browser's install-prompt logic and even on
     *   the login page itself, regardless of auth state.
     */
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico|brands/|icon$|apple-icon$|manifest.webmanifest|pwa-icon-|sw.js).*)",
  ],
};
