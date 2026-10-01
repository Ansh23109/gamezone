import { Plus } from "lucide-react";
import Link from "next/link";
import { listTenants } from "@/lib/actions/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantStatusToggle } from "@/components/admin/tenant-status-toggle";

export default async function AdminTenantsPage() {
  const tenants = await listTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
          <p className="text-sm text-muted mt-0.5">Every client gaming center running on this platform.</p>
        </div>
        <Link href="/admin/tenants/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" /> New Tenant
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader title="All Tenants" subtitle={`${tenants.length} client${tenants.length !== 1 ? "s" : ""}`} />
        <div className="divide-y divide-border">
          {tenants.length === 0 && <p className="px-5 py-8 text-center text-xs text-muted-2">No tenants yet.</p>}
          {tenants.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t.displayName}</p>
                <p className="text-xs text-muted font-mono">{t.subdomain}.edgeweb.co</p>
              </div>
              <TenantStatusToggle id={t.id} status={t.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
