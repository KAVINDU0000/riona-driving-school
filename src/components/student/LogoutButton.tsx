"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Ends the session on the server, then leaves the portal. The cookie is cleared by the logout response. */
export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[0.875rem] font-medium text-muted transition-colors hover:bg-page hover:text-ink disabled:opacity-60 ${className}`}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
