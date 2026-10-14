"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

/** Edits the two fields a student may change. The server checks them again and ignores everything else. */
export default function ProfileForm({ initialAddress, initialPhone }: { initialAddress: string; initialPhone: string }) {
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSaved(false);
    if (address.trim().length < 5) {
      setError("Enter your residential address.");
      return;
    }
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ""))) {
      setError("Enter a valid 10-digit mobile number, e.g. 0771234567.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ address, phoneNumber: phone }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Your details could not be saved. Try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5" aria-busy={pending}>
      <div className="flex flex-col gap-2">
        <label htmlFor="address" className="text-[0.8125rem] font-semibold text-ink">
          Residential address
        </label>
        <textarea
          id="address"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={pending}
          aria-describedby={error && error.includes("address") ? "profile-error" : undefined}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-[0.8125rem] font-semibold text-ink">
          Mobile number
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={pending}
          className={inputClass}
        />
      </div>

      {error && (
        <p id="profile-error" role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] font-medium text-success">
          Your details have been saved.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
