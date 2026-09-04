import { Download, DollarSign, Zap, Clock, Receipt, Timer, Repeat } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { RevenueAreaChart, CategoryBarChart, HourlyBarChart } from "@/components/charts";
import { getReportsData } from "@/lib/queries/reports";
import { resolveDateRange, type DateRangePreset } from "@/lib/date-range";
import { formatCurrency, formatDuration } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

const METHOD_COLORS: Record<string, string> = { CASH: "#22c55e", UPI: "#38bdf8", CARD: "#7c5cff", OTHER: "#f59e0b" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const preset = (sp.range as DateRangePreset) || "month";
  const range = resolveDateRange(preset, { from: sp.from, to: sp.to });
  const data = await getReportsData(range);

  const exportHref = `/api/reports/export?range=${preset}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted mt-0.5">{range.label} · detailed performance breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker current={preset} from={sp.from} to={sp.to} />
          <a href={exportHref} download>
            <Button variant="secondary">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} accent="success" />
        <StatCard label="Total Sessions" value={data.totalSessions} icon={Zap} accent="accent" />
        <StatCard label="Total Hours" value={`${data.totalHours}h`} icon={Clock} accent="info" />
        <StatCard label="Avg Session Duration" value={formatDuration(data.avgSessionDurationMinutes)} icon={Timer} accent="warning" />
        <StatCard label="Avg Revenue / Session" value={formatCurrency(data.avgRevenuePerSession)} icon={Receipt} accent="success" />
        <StatCard
          label="Repeat Customers"
          value={data.repeatCustomers}
          icon={Repeat}
          hint={`of ${data.totalCustomersWithSessions} total`}
          accent="accent"
        />
      </div>

      <Card>
        <CardHeader title="Revenue by Day" subtitle={range.label} />
        <CardBody>
          <RevenueAreaChart data={data.revenueByDay.map((d) => ({ label: d.label, value: d.revenue }))} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Revenue by Game" />
          <CardBody>
            <CategoryBarChart data={data.revenueByGame} format="currency" layout="horizontal" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sessions by Game" />
          <CardBody>
            <CategoryBarChart data={data.sessionsByGame} format="number" layout="horizontal" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Gaming Hours by Game" />
          <CardBody>
            <CategoryBarChart data={data.hoursByGame} format="hours" layout="horizontal" />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Revenue by Payment Method" />
          <CardBody>
            <CategoryBarChart
              data={data.revenueByPaymentMethod.map((m) => ({ name: PAYMENT_METHOD_LABELS[m.method], value: m.value, color: METHOD_COLORS[m.method] }))}
              format="currency"
              layout="horizontal"
              height={Math.max(120, data.revenueByPaymentMethod.length * 50)}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Hourly Occupancy" subtitle="Sessions started per hour, IST" />
          <CardBody>
            <HourlyBarChart data={data.hourlyOccupancy.map((h) => ({ hour: h.hour, value: h.sessions }))} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Top-Performing Stations" subtitle="Ranked by revenue in this range" />
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Station</th>
                <th className="px-5 py-2.5 font-medium">Game</th>
                <th className="px-5 py-2.5 font-medium">Revenue</th>
                <th className="px-5 py-2.5 font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.stationPerformance.slice(0, 15).map((s) => (
                <tr key={s.station} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 text-foreground font-medium">{s.station}</td>
                  <td className="px-5 py-3 text-muted">{s.gameType}</td>
                  <td className="px-5 py-3 text-foreground font-medium">{formatCurrency(s.revenue)}</td>
                  <td className="px-5 py-3 text-muted">{s.utilizationPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
