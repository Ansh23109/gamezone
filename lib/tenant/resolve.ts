import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export type Tenant = typeof schema.tenants.$inferSelect;

/**
 * Where a given `Host` header should route to, before any DB lookup.
 * Webhook requests are never resolved here — proxy.ts short-circuits them
 * by path (the matcher excludes /api/webhooks/*) before host resolution
 * even runs, so there's no "webhook" variant to carry here.
 */
export type HostMode = { kind: "tenant"; slug: string } | { kind: "admin" } | { kind: "marketing" };

const ROOT_DOMAIN = "edgeweb.co";
// Vercel preview/production URLs (gamezone-xxxxx.vercel.app) have no tenant
// subdomain of their own — they fall back to this seeded demo tenant with
// fake data, NEVER the real "ppp" production tenant. Set via env so it can
// be changed without a code deploy if the demo tenant's slug ever changes.
const VERCEL_FALLBACK_SLUG = process.env.DEMO_TENANT_SLUG || "demo";

/**
 * Pure, DB-free host -> routing-mode resolution. Exported separately from
 * the DB-backed tenant lookup below so it can be unit-tested without a
 * database and reused identically in proxy.ts and anywhere else that needs
 * to know "whose app is this" from a raw Host header.
 */
export function resolveHostMode(hostHeader: string | null): HostMode {
  const host = (hostHeader || "").toLowerCase().split(":")[0]; // strip port

  if (!host) return { kind: "marketing" };

  if (host === "admin." + ROOT_DOMAIN || host === `admin.localhost`) {
    return { kind: "admin" };
  }

  if (host === ROOT_DOMAIN || host === "www." + ROOT_DOMAIN) {
    return { kind: "marketing" };
  }

  if (host.endsWith("." + ROOT_DOMAIN)) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
    // Reject multi-label subdomains (e.g. a stray "foo.bar.edgeweb.co") —
    // only a single label is a valid tenant slug.
    if (slug && !slug.includes(".")) return { kind: "tenant", slug };
    return { kind: "marketing" };
  }

  // Local dev: http://ppp.localhost:3000 — `.localhost` always resolves to
  // loopback (RFC 6761), no /etc/hosts edit needed on modern browsers/Node.
  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (slug && !slug.includes(".")) return { kind: "tenant", slug };
    return { kind: "marketing" };
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return { kind: "tenant", slug: VERCEL_FALLBACK_SLUG };
  }

  // Vercel preview/production URLs and anything else unrecognized.
  if (host.endsWith(".vercel.app")) {
    return { kind: "tenant", slug: VERCEL_FALLBACK_SLUG };
  }

  return { kind: "marketing" };
}

// Small in-memory cache so a request doesn't need a DB round-trip just to
// resolve which tenant it belongs to — there are only a handful of tenants
// and a stale read for up to TTL_MS is an acceptable tradeoff (documented:
// a newly created/suspended tenant can take up to this long to take effect).
const TTL_MS = 60_000;
const cache = new Map<string, { tenant: Tenant | null; at: number }>();

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.tenant;

  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug));
  cache.set(slug, { tenant: tenant ?? null, at: Date.now() });
  return tenant ?? null;
}

/** Invalidate the cache for one slug — call after creating/updating/suspending a tenant so admin changes aren't stuck behind the TTL. */
export function invalidateTenantCache(slug: string) {
  cache.delete(slug);
}
