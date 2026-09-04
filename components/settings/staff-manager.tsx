"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/form";
import { createStaff, updateStaff } from "@/lib/actions/users";

type Staff = { id: string; name: string; email: string | null; role: string; isActive: boolean };

export function StaffManager({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleActive(s: Staff) {
    startTransition(async () => {
      await updateStaff(s.id, { isActive: !s.isActive });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader
        title="Staff"
        subtitle={`${staff.length} team member${staff.length !== 1 ? "s" : ""}`}
        action={
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Staff
          </Button>
        }
      />
      <div className="p-5 pt-2 space-y-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted">{s.email ?? "No email"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-surface text-muted border-border">{s.role}</Badge>
              <button
                onClick={() => toggleActive(s)}
                disabled={isPending}
                className={
                  "rounded-full px-2.5 py-1 text-xs font-medium border " +
                  (s.isActive ? "bg-success/15 text-success border-success/30" : "bg-surface text-muted-2 border-border")
                }
              >
                {s.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {open && <AddStaffModal onClose={() => setOpen(false)} />}
    </Card>
  );
}

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createStaff({ name, email: email || undefined, role });
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Add Staff Member" size="sm">
      <div className="p-5 space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label>Email (optional)</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Staff
          </Button>
        </div>
      </div>
    </Modal>
  );
}
