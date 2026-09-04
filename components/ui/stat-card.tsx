import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  accent = "accent",
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; positive: boolean };
  accent?: "accent" | "success" | "warning" | "info" | "danger";
}) {
  const accentClasses: Record<string, string> = {
    accent: "bg-accent-soft text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    danger: "bg-danger/15 text-danger",
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-2 truncate">{hint}</p>}
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-success" : "text-danger")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", accentClasses[accent])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  );
}
