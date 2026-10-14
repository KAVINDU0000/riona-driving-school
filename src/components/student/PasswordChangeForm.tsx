"use client";

import { useState, type FormEvent } from "react";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

/** Changes the password after the current one is checked on the server. Other devices are signed out. */
export default function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setMessage("");
    if (next.length < 8 || next.length > 128) {
      setError("Use between 8 and 128 characters for the new password.");
      return;
    }
    if (next !== repeat) {
      setError("The new passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Your password could not be changed. Try again.");
        return;
      }
      setMessage(data.message ?? "Your password has been changed.");
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={change} noValidate autoComplete="off" className="flex flex-col gap-4" aria-busy={pending}>
      <div className="flex flex-col gap-2">
        <label htmlFor="current-password" className="text-[0.8125rem] font-semibold text-ink">
          Current password
        </label>
        <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={pending} className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className="text-[0.8125rem] font-semibold text-ink">
          New password
        </label>
        <input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={pending} className={inputClass} />
        <p className="text-[0.8125rem] text-muted">At least 8 characters. Use a password you do not use anywhere else.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="repeat-new-password" className="text-[0.8125rem] font-semibold text-ink">
          Repeat new password
        </label>
        <input id="repeat-new-password" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} disabled={pending} className={inputClass} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] font-medium text-success">
          {message}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
