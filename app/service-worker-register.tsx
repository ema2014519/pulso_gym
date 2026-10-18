"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is progressive enhancement; the app remains usable online.
      });
      return;
    }

    // A production worker may still control localhost after switching back to dev.
    // Remove it and its app caches so Next.js never serves stale route bundles.
    void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
    if ("caches" in window) void caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("pulso-")).map((name) => caches.delete(name))));
  }, []);

  return null;
}
