"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setTenantStatus } from "@/lib/actions/admin";

export function TenantStatusToggle({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setTenantStatus(id, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border disabled:opacity-50 " +
        (status === "ACTIVE" ? "bg-success/15 text-success border-success/30" : "bg-danger/15 text-danger border-danger/30")
      }
    >
      {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "ACTIVE" ? "Active" : "Suspended"}
    </button>
  );
}
