"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_DANGER, BUTTON_INK, BUTTON_SECONDARY, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";
import { sendJson } from "@/components/admin/maintenance/api";

/** A record a document can be linked to, as "linkField:recordId". */
export type RecordOption = { value: string; label: string };

export function DocumentUpload({ base, recordOptions }: { base: string; recordOptions: RecordOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    const pick = String(data.get("record") ?? "");
    const [linkTo, linkId] = pick.includes(":") ? pick.split(":") : ["", ""];
    const body = new FormData();
    body.set("kind", String(data.get("kind") ?? ""));
    body.set("linkTo", linkTo);
    body.set("linkId", linkId);
    body.set("file", file);

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${base}/documents`, { method: "POST", body, cache: "no-store" });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(json?.error ?? "The file could not be uploaded. Please try again.");
      } else {
        setMessage("File saved privately.");
        form.reset();
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="document-upload-title" className="rounded-2xl border border-line bg-white p-5">
      <h3 id="document-upload-title" className="text-[1rem] font-bold text-ink">
        Upload a document
      </h3>
      <p className="mt-1 text-[0.875rem] text-muted">JPEG, PNG or PDF, up to 5 MB. Only administrators can open it, and it is never published as a web address.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="document-kind" className={LABEL}>
            Document type <span aria-hidden="true" className="text-red-600">*</span>
          </label>
          <select id="document-kind" name="kind" className={SELECT_FIELD} defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            <option value="INSURANCE_POLICY">Insurance policy</option>
            <option value="EMISSION_CERTIFICATE">Emission certificate</option>
            <option value="REVENUE_LICENCE">Revenue licence</option>
            <option value="SERVICE_INVOICE">Service invoice</option>
            <option value="INSPECTION_REPORT">Inspection report</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="document-record" className={LABEL}>
            Belongs to
          </label>
          <select id="document-record" name="record" className={SELECT_FIELD} defaultValue="">
            <option value="">No specific record</option>
            {recordOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="document-file" className={LABEL}>
            File <span aria-hidden="true" className="text-red-600">*</span>
          </label>
          <input id="document-file" name="file" type="file" accept="image/jpeg,image/png,application/pdf" className={FIELD} />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      ) : null}
      {message && !error ? (
        <p role="status" className="mt-4 text-[0.875rem] font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={busy} className={BUTTON_INK}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

/** Removes a document (soft delete). The reason is required and recorded. The file itself is kept for the retention period. */
export function DocumentRemove({ base, documentId }: { base: string; documentId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const result = await sendJson(`${base}/documents/${documentId}`, "DELETE", { reason });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-[0.8125rem] font-semibold text-ink">
        Reason for removing
        <input value={reason} onChange={(event) => setReason(event.target.value)} className={FIELD} maxLength={1000} />
      </label>
      <button type="button" onClick={remove} disabled={busy} className={BUTTON_DANGER}>
        {busy ? "Removing…" : "Remove document"}
      </button>
      {error ? (
        <p role="alert" className="basis-full text-[0.8125rem] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Creates the open in-app reminders for today. Safe to press again: nothing new is created the second time. Nothing is sent. */
export function ReminderGenerate({ base }: { base: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await sendJson(`${base}/reminders`, "POST");
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const data = result.data as { result?: { created: number; superseded: number } };
    setMessage(`${data.result?.created ?? 0} new reminder(s) created. ${data.result?.superseded ?? 0} older reminder(s) replaced.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={generate} disabled={busy} className={BUTTON_SECONDARY}>
        {busy ? "Checking…" : "Check reminders for today"}
      </button>
      {message ? <span role="status" className="text-[0.875rem] text-emerald-700">{message}</span> : null}
      {error ? <span role="alert" className="text-[0.875rem] text-red-700">{error}</span> : null}
    </div>
  );
}

export function ReminderAcknowledge({ base, reminderId }: { base: string; reminderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function acknowledge() {
    setBusy(true);
    setError("");
    const result = await sendJson(`${base}/reminders/${reminderId}`, "POST");
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={acknowledge} disabled={busy} className={BUTTON_SECONDARY}>
        {busy ? "Saving…" : "Acknowledge"}
      </button>
      {error ? <span role="alert" className="text-[0.8125rem] text-red-700">{error}</span> : null}
    </span>
  );
}
