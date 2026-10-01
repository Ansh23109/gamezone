"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid" | "saving" | "done";

/**
 * Lands here from the Supabase invite-email link, which carries the session
 * tokens in the URL hash fragment (#access_token=...&type=invite). The
 * fragment never reaches the server, so this has to be a Client Component —
 * the browser Supabase client (lib/supabase/client.ts) has
 * detectSessionInUrl on by default and processes it automatically on init,
 * writing the resulting session to cookies so the server recognizes it on
 * the very next request.
 */
export function AcceptInviteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // The hash is processed as part of client init; give it a moment, then
    // also listen in case it resolves slightly after mount.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setStatus("ready");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) setStatus("ready");
    });

    const timeout = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 3000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setStatus("ready");
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 800);
  }

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
        <p className="text-sm text-muted">Verifying your invite link...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-foreground font-medium">This invite link is invalid or has expired.</p>
        <p className="text-xs text-muted mt-1">Ask whoever invited you to send a new one.</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-foreground font-medium">Password set — signing you in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted">Set a password to finish setting up your account.</p>
      <div>
        <Label>New password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required minLength={8} />
      </div>
      <div>
        <Label>Confirm password</Label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full justify-center" disabled={status === "saving"}>
        {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Set password & continue
      </Button>
    </form>
  );
}
