"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Mobile number editing. The server enforces the same rule, so this only gives quicker feedback. */
export default function MobileNumberForm({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/instructor/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phoneNumber: value }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "The mobile number could not be saved.");
        return;
      }
      setNotice("Mobile number saved.");
      router.refresh();
    } catch {
      setError("The mobile number could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
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
      <label className="grid gap-1.5 text-[0.8125rem] font-semibold text-ink">
        Mobile number
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="0712345678"
          aria-describedby="mobile-hint"
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.9375rem] font-normal text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25"
        />
      </label>
      <p id="mobile-hint" className="text-[0.8125rem] text-muted">
        10 digits, starting with 0.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="justify-self-start rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save mobile number"}
      </button>
    </form>
  );
}
