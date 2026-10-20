"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { BUTTON_DANGER, BUTTON_PRIMARY } from "@/components/admin/admin-ui";

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Deactivates or reactivates a student account. Deactivating stops sign-in and ends current sessions; no record is
 * deleted. Upcoming lessons are not cancelled here, so the school must handle them separately.
 */
export default function StudentStatusControl({
  userId,
  fullName,
  status,
}: {
  userId: string;
  fullName: string;
  status: "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const deactivating = status === "ACTIVE";
  const next = deactivating ? "INACTIVE" : "ACTIVE";

  async function change() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The account could not be changed."));
      setConfirming(false);
      setNotice(deactivating ? `${fullName} has been deactivated. They cannot sign in.` : `${fullName} has been reactivated.`);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The account could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {deactivating ? (
          <button type="button" onClick={() => setConfirming(true)} disabled={busy} className={`${BUTTON_DANGER} h-11 px-5`}>
            Deactivate student
          </button>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={busy} className={`${BUTTON_PRIMARY} h-11 px-5`}>
            Reactivate student
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className="text-[0.875rem] text-success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[0.875rem] text-red-700">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={deactivating ? "Deactivate this student?" : "Reactivate this student?"}
        confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
        busy={busy}
        onConfirm={() => void change()}
        onCancel={() => setConfirming(false)}
      >
        {deactivating ? (
          <p>
            {fullName} will be signed out and cannot sign in until the account is reactivated. Their enrollments, payments,
            lessons and history are kept. Upcoming lessons are not cancelled.
          </p>
        ) : (
          <p>{fullName} will be able to sign in again.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
