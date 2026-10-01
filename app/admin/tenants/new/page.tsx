import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewTenantForm } from "@/components/admin/new-tenant-form";

export default function NewTenantPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tenants
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Tenant</h1>
        <p className="text-sm text-muted mt-0.5">
          Creates the client and invites their first admin by email. Drop their logo at{" "}
          <code className="text-xs bg-surface-2 rounded px-1 py-0.5">public/brands/&lt;slug&gt;/logo.svg</code> and redeploy
          for it to show up.
        </p>
      </div>
      <NewTenantForm />
    </div>
  );
}
