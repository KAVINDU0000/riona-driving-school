"use client";

import { useState, type FormEvent } from "react";
import { BUTTON_INK, FIELD, LABEL } from "@/components/admin/admin-ui";

const SEVERITIES = [
  { value: "LOW", label: "Low – minor, can wait" },
  { value: "MEDIUM", label: "Medium – needs attention soon" },
  { value: "HIGH", label: "High – needs attention before more lessons" },
  { value: "CRITICAL", label: "Critical – safety concern" },
] as const;

/**
 * Report a fault on the vehicle used in this lesson. It only tells the school. The school decides on repair and on whether
 * the vehicle stays in service, so this form never changes the vehicle's status.
 */
export default function VehicleFaultForm({ vehicleId, vehicleLabel }: { vehicleId: string; vehicleLabel: string }) {
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/instructor/vehicles/${vehicleId}/faults`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ severity, description }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "The report could not be sent.");
        return;
      }
      setNotice("Reported to the school. The vehicle's status has not been changed.");
      setDescription("");
    } catch {
      setError("The report could not be sent. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl bg-white p-3 ring-1 ring-line">
      <summary className="cursor-pointer text-[0.875rem] font-semibold text-ink">Report a fault on {vehicleLabel}</summary>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3">
        {notice && (
          <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
            {error}
          </p>
        )}
        <label className={`grid gap-1.5 ${LABEL}`}>
          How serious is it?
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className={FIELD}>
            {SEVERITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`grid gap-1.5 ${LABEL}`}>
          What is wrong?
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} className={FIELD} />
        </label>
        <button type="submit" disabled={busy || !description.trim()} className={`${BUTTON_INK} justify-self-start`}>
          {busy ? "Sending…" : "Send report to the school"}
        </button>
      </form>
    </details>
  );
}
