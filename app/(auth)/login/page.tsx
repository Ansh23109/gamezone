import { Joystick } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getTenantContext } from "@/lib/tenant/context";
import { resolveLogoSrc } from "@/lib/tenant/branding";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { tenant } = await getTenantContext();
  const displayName = tenant?.displayName ?? "Gaming Center Management";
  const logoSrc = tenant ? resolveLogoSrc(tenant.slug, tenant.logoPath) : null;
  const primaryColor = tenant?.primaryColor ?? "#6366f1";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {logoSrc ? (
              <Image src={logoSrc} alt="" width={48} height={48} className="h-full w-full object-cover" />
            ) : (
              <Joystick className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted">Sign in to the management console</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
