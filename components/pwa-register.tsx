"use client";

import { useEffect } from "react";

/** Registers public/sw.js — a no-op passthrough service worker that exists
 * solely to satisfy Chrome/Android's "Add to Home Screen" install criteria
 * (one of which is having a fetch-handling service worker). Mounted once in
 * the root layout so it applies everywhere: tenant app, admin console, and
 * the pre-auth login/accept-invite pages. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-critical — the app works fully without it, just without an install prompt.
      });
    }
  }, []);

  return null;
}
