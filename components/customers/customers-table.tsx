"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/form";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CustomerWithStats } from "@/lib/queries/customers";

export function CustomersTable({ customers }: { customers: CustomerWithStats[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q));
  }, [customers, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
        <Input placeholder="Search by name or mobile..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Visits</th>
              <th className="px-4 py-2.5 font-medium">Total Spent</th>
              <th className="px-4 py-2.5 font-medium">Gaming Hours</th>
              <th className="px-4 py-2.5 font-medium">Favourite Game</th>
              <th className="px-4 py-2.5 font-medium">Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-2">
                  No customers found.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="text-foreground font-medium hover:text-accent">
                    {c.name}
                  </Link>
                  {!c.mobile.startsWith("GUEST-") && <p className="text-xs text-muted">{c.mobile}</p>}
                </td>
                <td className="px-4 py-3 text-muted">{c.totalVisits}</td>
                <td className="px-4 py-3 text-foreground font-medium">{formatCurrency(c.totalSpent)}</td>
                <td className="px-4 py-3 text-muted">{c.totalHours}h</td>
                <td className="px-4 py-3 text-muted">{c.favouriteGame ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{c.lastVisit ? formatDate(c.lastVisit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
