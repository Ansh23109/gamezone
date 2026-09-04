import { Wallet, Receipt, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { CategoryBarChart } from "@/components/charts";
import { listTransactions, getDailySalesSummary } from "@/lib/queries/payments";
import { resolveDateRange, type DateRangePreset } from "@/lib/date-range";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

const METHOD_COLORS: Record<string, string> = { CASH: "#22c55e", UPI: "#38bdf8", CARD: "#7c5cff", OTHER: "#f59e0b" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const preset = (sp.range as DateRangePreset) || "today";
  const range = resolveDateRange(preset, { from: sp.from, to: sp.to });

  const [transactions, summary] = await Promise.all([listTransactions(range), getDailySalesSummary(range)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Payments</h1>
          <p className="text-sm text-muted mt-0.5">{range.label} · sales & transactions</p>
        </div>
        <DateRangePicker current={preset} from={sp.from} to={sp.to} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Collected" value={formatCurrency(summary.total)} icon={Wallet} accent="success" />
        <StatCard label="Transactions" value={summary.count} icon={Receipt} accent="info" />
        <StatCard label="Outstanding" value={formatCurrency(summary.outstanding)} icon={AlertCircle} hint={`${summary.outstandingCount} unpaid/partial`} accent="warning" />
      </div>

      <Card>
        <CardHeader title="Revenue by Payment Method" />
        <div className="p-5 pt-2">
          <CategoryBarChart
            data={summary.byMethod.map((m) => ({ name: PAYMENT_METHOD_LABELS[m.method], value: m.amount, color: METHOD_COLORS[m.method] }))}
            format="currency"
            layout="horizontal"
            height={Math.max(120, summary.byMethod.length * 50)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Transactions" subtitle={`${transactions.length} records`} />
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Transaction</th>
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-5 py-2.5 font-medium">Game / Station</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Method</th>
                <th className="px-5 py-2.5 font-medium">Staff</th>
                <th className="px-5 py-2.5 font-medium">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-muted-2">
                    No transactions in this range.
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 text-muted-2 font-mono text-xs">#{t.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-foreground">{t.customer.name}</td>
                  <td className="px-5 py-3 text-muted">
                    {t.gameType?.name ?? "—"} {t.station ? `· ${t.station.name}` : ""}
                  </td>
                  <td className="px-5 py-3 text-foreground font-medium">{formatCurrency(t.amount)}</td>
                  <td className="px-5 py-3">
                    <Badge className="bg-surface-2 text-muted border-border">{PAYMENT_METHOD_LABELS[t.method]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">{t.staff?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
