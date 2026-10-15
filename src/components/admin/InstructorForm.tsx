"use client";

import { useState, type FormEvent } from "react";

type InstructorDetails = {
  instructorId: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  hireDate: string;
};

const EMPTY_DETAILS: InstructorDetails = { instructorId: "", email: "", fullName: "", phoneNumber: "", hireDate: "" };

const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

/**
 * Admin form that creates an instructor account and sends the invitation. The account has no usable password
 * until the instructor sets one through the invitation link. The server checks every field again.
 */
export default function InstructorForm() {
  const [details, setDetails] = useState<InstructorDetails>(EMPTY_DETAILS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function update(field: keyof InstructorDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(details),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; instructor?: { userId: string; email: string } }
        | null;
      if (!response.ok || !body?.instructor) {
        setError(body?.error ?? "The instructor account could not be created.");
        return;
      }
      setNotice(`Instructor ${body.instructor.userId} was created. An invitation was sent to ${body.instructor.email}.`);
      setDetails(EMPTY_DETAILS);
    } catch {
      setError("The instructor account could not be created. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {notice && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success sm:col-span-2">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700 sm:col-span-2">
          {error}
        </p>
      )}

      <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
        Instructor ID
        <input
          required
          value={details.instructorId}
          onChange={(event) => update("instructorId", event.target.value)}
          placeholder="INS-001"
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </label>
      <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
        Full name
        <input
          required
          value={details.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          className={INPUT_CLASS}
        />
      </label>
      <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
        Email (for the invitation)
        <input
          required
          type="email"
          value={details.email}
          onChange={(event) => update("email", event.target.value)}
          autoComplete="off"
          className={INPUT_CLASS}
        />
      </label>
      <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
        Mobile number
        <input
          required
          type="tel"
          value={details.phoneNumber}
          onChange={(event) => update("phoneNumber", event.target.value)}
          placeholder="0712345678"
          className={INPUT_CLASS}
        />
      </label>
      <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
        Hire date
        <input
          required
          type="date"
          value={details.hireDate}
          onChange={(event) => update("hireDate", event.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      <div className="flex items-end sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create instructor and send invitation"}
        </button>
      </div>
    </form>
  );
}
