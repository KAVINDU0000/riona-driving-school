"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_PRIMARY, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";
import { labels } from "@/components/student/format";

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Two forms that add a scheduled medical appointment and a scheduled exam for this student. Records can only be added
 * here. Changing or cancelling them is not available yet.
 */
export default function AddAppointmentForms({ userId, disabled }: { userId: string; disabled: boolean }) {
  return (
    <div className="grid gap-6">
      <MedicalForm userId={userId} disabled={disabled} />
      <ExamForm userId={userId} disabled={disabled} />
    </div>
  );
}

function MedicalForm({ userId, disabled }: { userId: string; disabled: boolean }) {
  const router = useRouter();
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(userId)}/medical-appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appointmentDate: when, description: note }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The appointment could not be added."));
      setWhen("");
      setNote("");
      setNotice("Medical appointment added.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The appointment could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-white p-4">
      <p className="text-[0.9375rem] font-bold text-ink">Add a medical appointment</p>
      <div className="grid gap-1.5">
        <label htmlFor="medical-when" className={LABEL}>
          Date and time (school time)
        </label>
        <input
          id="medical-when"
          type="datetime-local"
          required
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          disabled={busy || disabled}
          className={`${FIELD} h-11`}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="medical-note" className={LABEL}>
          Note (optional, not shown in admin lists)
        </label>
        <textarea
          id="medical-note"
          maxLength={500}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={busy || disabled}
          className={`${FIELD} py-2`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || disabled || when === ""} className={`${BUTTON_PRIMARY} h-11 px-5`}>
          {busy ? "Adding…" : "Add appointment"}
        </button>
        {notice && <p role="status" className="text-[0.875rem] text-success">{notice}</p>}
        {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
      </div>
    </form>
  );
}

function ExamForm({ userId, disabled }: { userId: string; disabled: boolean }) {
  const router = useRouter();
  const [examType, setExamType] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(userId)}/exams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examType, vehicleType: vehicleType || null, scheduledDate: when }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The exam could not be added."));
      setExamType("");
      setVehicleType("");
      setWhen("");
      setNotice("Exam added.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The exam could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-white p-4">
      <p className="text-[0.9375rem] font-bold text-ink">Add an exam</p>
      <div className="grid gap-1.5">
        <label htmlFor="exam-type" className={LABEL}>
          Exam type
        </label>
        <div className="relative">
          <select
            id="exam-type"
            required
            value={examType}
            onChange={(event) => setExamType(event.target.value)}
            disabled={busy || disabled}
            className={`${SELECT_FIELD} h-11`}
          >
            <option value="">Choose an exam type</option>
            {Object.entries(labels.examType).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="exam-vehicle" className={LABEL}>
          Vehicle type (optional)
        </label>
        <div className="relative">
          <select
            id="exam-vehicle"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            disabled={busy || disabled}
            className={`${SELECT_FIELD} h-11`}
          >
            <option value="">No vehicle type</option>
            {Object.entries(labels.vehicleType).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="exam-when" className={LABEL}>
          Date and time (school time)
        </label>
        <input
          id="exam-when"
          type="datetime-local"
          required
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          disabled={busy || disabled}
          className={`${FIELD} h-11`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || disabled || examType === "" || when === ""} className={`${BUTTON_PRIMARY} h-11 px-5`}>
          {busy ? "Adding…" : "Add exam"}
        </button>
        {notice && <p role="status" className="text-[0.875rem] text-success">{notice}</p>}
        {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
      </div>
    </form>
  );
}
