"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BUTTON_SECONDARY } from "@/components/admin/admin-ui";

/**
 * Shown when the maintenance page cannot load. The error text is not shown, because it can contain database detail. It is
 * logged on the client only, by name.
 */
export default function MaintenanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[maintenance] page failed to load:", error.name);
  }, [error]);

  return (
    <section role="alert" className="glass mt-6 rounded-[22px] p-6">
      <h2 className="text-[1.125rem] font-bold text-ink">Maintenance could not be loaded</h2>
      <p className="mt-2 text-[0.9375rem] text-muted">
        Something went wrong while reading this vehicle&apos;s records. Nothing was changed. Try again, or go back to the vehicle.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className={BUTTON_SECONDARY}>
          Try again
        </button>
        <Link href="/portal/admin/vehicles" className={BUTTON_SECONDARY}>
          Back to vehicles
        </Link>
      </div>
    </section>
  );
}
