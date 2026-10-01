"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { createTenant } from "@/lib/actions/admin";

export function NewTenantForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!slug.trim() || !displayName.trim() || !adminName.trim() || !adminEmail.trim()) {
      setError("All fields except color are required.");
      return;
    }
    startTransition(async () => {
      try {
        await createTenant({ slug, displayName, primaryColor, adminName, adminEmail });
        setSuccess(true);
        setTimeout(() => router.push("/admin"), 1000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create tenant.");
      }
    });
  }

  if (success) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">Tenant created — invite sent.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5 space-y-4">
        <div>
          <Label>Subdomain / slug</Label>
          <div className="flex items-center gap-1.5">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clientb" autoFocus />
            <span className="text-xs text-muted-2 whitespace-nowrap">.edgeweb.co</span>
          </div>
        </div>
        <div>
          <Label>Business display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Client B Gaming Lounge" />
        </div>
        <div>
          <Label>Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-9 rounded-lg border border-border-strong bg-surface-2"
            />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
        </div>
        <hr className="border-border" />
        <div>
          <Label>First admin&apos;s name</Label>
          <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        </div>
        <div>
          <Label>First admin&apos;s email</Label>
          <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} type="email" placeholder="they'll get an invite here" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end">
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Tenant
          </Button>
        </div>
      </div>
    </Card>
  );
}
