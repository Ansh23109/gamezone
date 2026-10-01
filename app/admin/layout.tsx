import { Shield } from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { signOut } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

// Cross-tenant owner console — reachable only at admin.edgeweb.co (gated at
// the host level by proxy.ts), re-checked here per Next's own guidance to
// never rely on proxy alone. Deliberately NOT nested under app/(tenant)/ —
// no tenant branding, no tenant shell, since this isn't scoped to one tenant.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireOwner();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">Owner Console</p>
            <p className="text-[10px] text-muted-2 leading-tight">Cross-tenant administration</p>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs font-medium text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
