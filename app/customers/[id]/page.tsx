import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Trophy, Wallet, Clock, Repeat } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { getCustomerDetail } from "@/lib/queries/customers";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/format";
import { BOOKING_STATUS_STYLES, PAYMENT_STATUS_STYLES, PAYMENT_METHOD_LABELS } from "@/lib/constants";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  const { customer, bookings, transactions, stats } = detail;
  const isGuest = customer.mobile.startsWith("GUEST-");

  return (
    <div className="space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground">{customer.name}</h1>
        {!isGuest && (
          <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> {customer.mobile}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Visits" value={stats.totalVisits} icon={Repeat} accent="info" />
        <StatCard label="Total Spent" value={formatCurrency(stats.totalSpent)} icon={Wallet} accent="success" />
        <StatCard label="Gaming Hours" value={`${stats.totalHours}h`} icon={Clock} accent="warning" />
        <StatCard label="Favourite Game" value={stats.favouriteGame ?? "—"} icon={Trophy} accent="accent" />
      </div>

      <Card>
        <CardHeader title="Booking History" subtitle={`${bookings.length} bookings`} />
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Game / Station</th>
                <th className="px-5 py-2.5 font-medium">Duration</th>
                <th className="px-5 py-2.5 font-medium">Price</th>
                <th className="px-5 py-2.5 font-medium">Payment</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-muted-2">
                    No bookings yet.
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(b.startTime)}</td>
                  <td className="px-5 py-3 text-foreground">
                    {b.gameType.name} · {b.station.name}
                  </td>
                  <td className="px-5 py-3 text-muted">{formatDuration(b.durationMinutes)}</td>
                  <td className="px-5 py-3 text-foreground font-medium">{formatCurrency(b.price)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge style={PAYMENT_STATUS_STYLES[b.paymentStatus]} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge style={BOOKING_STATUS_STYLES[b.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Payment History" subtitle={`${transactions.length} transactions`} />
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Game / Station</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Method</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-xs text-muted-2">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                  <td className="px-5 py-3 text-foreground">
                    {t.gameType?.name ?? "—"} {t.station ? `· ${t.station.name}` : ""}
                  </td>
                  <td className="px-5 py-3 text-foreground font-medium">{formatCurrency(t.amount)}</td>
                  <td className="px-5 py-3 text-muted">{PAYMENT_METHOD_LABELS[t.method]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
