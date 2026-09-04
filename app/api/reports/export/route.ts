import { NextRequest } from "next/server";
import { listTransactions } from "@/lib/queries/payments";
import { resolveDateRange, type DateRangePreset } from "@/lib/date-range";
import { formatDateTime } from "@/lib/format";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const preset = (searchParams.get("range") as DateRangePreset) || "month";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const range = resolveDateRange(preset, { from, to });

  const transactions = await listTransactions(range, 10000);

  const header = [
    "Transaction ID",
    "Date/Time",
    "Customer",
    "Mobile",
    "Game",
    "Station",
    "Amount (INR)",
    "Payment Method",
    "Staff",
  ];

  const rows = transactions.map((t) => [
    t.id,
    formatDateTime(t.createdAt),
    t.customer.name,
    t.customer.mobile,
    t.gameType?.name ?? "",
    t.station?.name ?? "",
    Number(t.amount).toFixed(2),
    t.method,
    t.staff?.name ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gamezone-report-${preset}.csv"`,
    },
  });
}
