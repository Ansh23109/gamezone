import { listActiveSessions } from "@/lib/queries/sessions";
import { SessionCard } from "@/components/sessions/session-card";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActiveSessionsPage() {
  const sessions = await listActiveSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Active Sessions</h1>
        <p className="text-sm text-muted mt-0.5">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} currently in progress
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Zap className="h-8 w-8 text-muted-2 mb-3" />
          <p className="text-sm font-medium text-foreground">No active sessions right now</p>
          <p className="text-xs text-muted mt-1">Start a walk-in from the top bar to get going.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
