/**
 * TEMPORARY flag, added at the user's explicit request: "remove auth for
 * now, directly accessible." Scope, as confirmed with the user: tenant
 * subdomains (ppp.edgeweb.co and any future client) only — admin.edgeweb.co
 * is NOT affected and still requires a real OWNER session regardless.
 *
 * When true:
 *  - proxy.ts stops redirecting unauthenticated tenant-host requests to /login.
 *  - lib/tenant/context.ts falls back to the tenant's first active staff
 *    member as a synthetic signed-in identity, so requireTenantUser() still
 *    succeeds for every page/Server Action (none of them had to change).
 *
 * To turn real tenant login back on: flip this back to `false` and redeploy.
 * Nothing else needs to change — every tenant-scoping/auth check downstream
 * of this flag is untouched and will immediately start enforcing real
 * sessions again.
 */
export const TENANT_AUTH_DISABLED = true;
