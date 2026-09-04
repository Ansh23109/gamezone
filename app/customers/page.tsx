import { Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { CustomersTable } from "@/components/customers/customers-table";
import { listCustomersWithStats } from "@/lib/queries/customers";
import { formatCurrency } from "@/lib/format";
import { Wallet, Repeat, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await listCustomersWithStats();
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const repeatCount = customers.filter((c) => c.totalVisits > 1).length;
  const totalHours = customers.reduce((sum, c) => sum + c.totalHours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted mt-0.5">Everyone who has visited, with their full history.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={customers.length} icon={Users} accent="info" />
        <StatCard label="Repeat Customers" value={repeatCount} icon={Repeat} accent="accent" />
        <StatCard label="Total Revenue" value={formatCurrency(totalSpent)} icon={Wallet} accent="success" />
        <StatCard label="Total Hours Played" value={`${Math.round(totalHours)}h`} icon={Clock} accent="warning" />
      </div>

      <CustomersTable customers={customers} />
    </div>
  );
}
