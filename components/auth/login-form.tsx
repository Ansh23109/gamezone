"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset-sent">("signin");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Supabase's own message ("Invalid login credentials") doesn't say
        // *why*, which is correct (never reveal whether the email exists) —
        // but it's the single most common point of confusion, usually a
        // saved-password-manager entry with an old/changed password rather
        // than a typo. Surface "Forgot password?" right alongside it.
        setError(error.message);
        return;
      }
      // proxy.ts redirects an authenticated-for-this-tenant session away from
      // /login automatically, but a full refresh is needed so the Server
      // Components (which read the now-fresh session cookie) re-render.
      router.push("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email above first, then click “Forgot password”.");
      return;
    }
    setIsPending(true);
    try {
      const supabase = createClient();
      // Lands on the same page that handles invite links — it already
      // establishes a session from the URL hash and prompts for a new
      // password (components/auth/accept-invite-form.tsx).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/accept-invite`,
      });
      // Never reveal whether the email exists either way — always show the
      // same confirmation regardless of error, same as the sign-in error
      // message's own non-disclosure already does implicitly.
      if (error) {
        // Email-sending failures (rate limits, SMTP misconfig) are the one
        // case worth surfacing — a silent "check your inbox" when nothing
        // was actually sent would be worse than this message.
        setError(error.message);
        return;
      }
      setMode("reset-sent");
    } finally {
      setIsPending(false);
    }
  }

  if (mode === "reset-sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Check your inbox</p>
          <p className="text-xs text-muted mt-1">
            If an account exists for {email}, a password reset link is on its way.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="text-xs font-medium text-accent hover:text-accent-2"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Password</Label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isPending}
            className="text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full justify-center" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Sign in
      </Button>
    </form>
  );
}
