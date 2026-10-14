"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { portalPathForRole } from "@/lib/auth/portal";

type MenuState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; portalPath: string };

const linkClass =
  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[0.875rem] font-medium text-muted transition-colors hover:bg-page hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

/**
 * Account navigation. It asks /api/auth/me who is signed in, and asks again after each route change,
 * so it updates after login and logout. The response only decides which links to show. Each portal
 * page still checks the session on the server.
 */
export default function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<MenuState>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          // 401 covers both "never signed in" and "session expired". Both show the signed-out state.
          setState({ status: "signed-out" });
          return;
        }
        const data = (await response.json()) as { user?: { role?: unknown } };
        const portalPath = portalPathForRole(data.user?.role);
        setState(portalPath ? { status: "signed-in", portalPath } : { status: "signed-out" });
      })
      .catch(() => {
        if (active) setState({ status: "signed-out" });
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
    } finally {
      setState({ status: "signed-out" });
      setSigningOut(false);
      router.replace("/login");
      router.refresh();
    }
  }

  if (state.status === "loading") {
    // Reserves the space so the header does not jump when the state arrives.
    return <span aria-hidden="true" className="inline-block h-9 w-24" />;
  }

  if (state.status === "signed-out") {
    return (
      <Link href="/login" className={linkClass}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link href={state.portalPath} className={linkClass}>
        My portal
      </Link>
      <button type="button" onClick={signOut} disabled={signingOut} className={`${linkClass} disabled:opacity-60`}>
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
