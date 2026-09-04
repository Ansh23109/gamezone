import { DollarSign, CalendarClock, Zap, CheckCircle2, Users, Clock, Receipt, Gauge, Trophy, ListChecks } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { RevenueAreaChart, BookingsLineChart, CategoryBarChart, HourlyBarChart } from "@/components/charts";
import { getDashboardData } from "@/lib/queries/dashboard";
import { resolveDateRange, type DateRangePreset } from "@/lib/date-range";
import { formatCurrency, formatDuration, formatTime } from "@/lib/format";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const preset = (sp.range as DateRangePreset) || "today";
  const range = resolveDateRange(preset, { from: sp.from, to: sp.to });
  let data;
  try {
    data = await getDashboardData(range);
  } catch (err) {
    // If data fetching fails (for example when DATABASE_URL is not set on Vercel),
    // render a helpful fallback so the site doesn't appear completely blank.
    // Log the error server-side for visibility in deployment logs.
    // eslint-disable-next-line no-console
    console.error("Dashboard data load failed:", err);

    return (
      <div className="p-6">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted mt-2">
            Unable to load dashboard data. This often means the database or environment
            variables are not configured for this deployment (for example, DATABASE_URL).
          </p>
          <p className="text-sm text-muted mt-2">Check your deployment logs and environment settings on Vercel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">{range.label} · operational overview</p>
        </div>
        <DateRangePicker current={preset} from={sp.from} to={sp.to} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Total Sales" value={formatCurrency(data.kpis.totalSales)} icon={DollarSign} accent="success" />
        <StatCard label="Bookings" value={data.kpis.totalBookings} icon={CalendarClock} accent="info" />
        <StatCard label="Active Sessions" value={data.kpis.activeSessions} icon={Zap} accent="accent" />
        <StatCard label="Completed Sessions" value={data.kpis.completedSessions} icon={CheckCircle2} accent="success" />
        <StatCard label="Upcoming Bookings" value={data.kpis.upcomingBookingsCount} icon={ListChecks} accent="warning" />
        <StatCard label="Total Customers" value={data.kpis.totalCustomers} icon={Users} accent="info" />
        <StatCard label="Gaming Hours Sold" value={`${data.kpis.totalGamingHours}h`} icon={Clock} accent="accent" />
        <StatCard label="Avg Booking Value" value={formatCurrency(data.kpis.avgBookingValue)} icon={Receipt} accent="success" />
        <StatCard label="Station Utilization" value={`${data.kpis.overallUtilization}%`} icon={Gauge} accent="warning" />
        <StatCard label="Most Popular Game" value={data.kpis.mostPopularGame ?? "—"} icon={Trophy} accent="accent" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Revenue Over Time" subtitle={range.label} />
          <CardBody>
            <RevenueAreaChart data={data.revenueOverTime} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Bookings Over Time" subtitle={range.label} />
          <CardBody>
            <BookingsLineChart data={data.bookingsOverTime} />
          </CardBody>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Revenue by Game Type" />
          <CardBody>
            <CategoryBarChart
              data={data.revenueByGameType.map((r) => ({ name: r.gameType, value: r.revenue, color: r.color }))}
              format="currency"
              layout="horizontal"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Gaming Hours by Game Type" />
          <CardBody>
            <CategoryBarChart
              data={data.gamingHoursByGameType.map((r) => ({ name: r.gameType, value: r.hours, color: r.color }))}
              format="hours"
              layout="horizontal"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Peak Booking Hours" subtitle="IST" />
          <CardBody>
            <HourlyBarChart data={data.peakHours.map((p) => ({ hour: p.hour, value: p.bookings }))} />
          </CardBody>
        </Card>
      </div>

      {/* Station utilization + upcoming bookings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <CardHeader title="Station Utilization" subtitle={range.label} />
          <CardBody className="space-y-3">
            {data.stationUtilization.slice(0, 10).map((s) => (
              <div key={s.station}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">{s.station}</span>
                  <span className="text-muted">{s.utilizationPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, s.utilizationPct)}%` }} />
                </div>
              </div>
            ))}
            {data.stationUtilization.length === 0 && <p className="text-xs text-muted-2">No sessions in this range.</p>}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Upcoming Bookings"
            subtitle="Next scheduled sessions"
            action={
              <Link href="/bookings" className="text-xs font-medium text-accent hover:text-accent-2">
                View all →
              </Link>
            }
          />
          <CardBody className="p-0">
            <div className="divide-y divide-border">
              {data.upcomingBookings.length === 0 && (
                <p className="px-5 py-6 text-xs text-muted-2">No upcoming bookings.</p>
              )}
              {data.upcomingBookings.map((b) => {
                const gameType = data.gameTypeById.get(b.gameTypeId);
                const station = data.stationById.get(b.stationId);
                return (
                  <div key={b.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {gameType?.name} · {station?.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {formatTime(b.startTime)} · {formatDuration(b.durationMinutes)}
                      </p>
                    </div>
                    <StatusBadge style={BOOKING_STATUS_STYLES[b.status]} />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
