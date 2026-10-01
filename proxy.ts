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
    if (!isAuthenticated || appMetadata.role !== "OWNER") {
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

  const isOwner = isAuthenticated && appMetadata.role === "OWNER";
  const sessionMatchesTenant = isAuthenticated && appMetadata.tenantId === tenant.id;

  if (request.nextUrl.pathname.startsWith("/login")) {
    // Already signed in for this tenant (or OWNER impersonating) -> skip the login page.
    if (isOwner || sessionMatchesTenant) {
      return redirectTo(request, "/", response);
    }
    return response;
  }

  if (!isOwner && !sessionMatchesTenant) {
    return redirectTo(request, "/login", response);
  }

  return response;
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
