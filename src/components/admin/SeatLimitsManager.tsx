"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_INK, FIELD, LABEL } from "@/components/admin/admin-ui";
import type { SeatLimit } from "@/lib/session-slots/seats";

const TYPE_LABELS: Record<string, string> = {
  CAR: "Car",
  VAN: "Van",
  MOTORCYCLE: "Motorbike",
  THREE_WHEELER: "Three-wheeler",
};

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** How many students one vehicle of each type takes in one session. New sessions use the new number. */
export default function SeatLimitsManager({ limits }: { limits: SeatLimit[] }) {
  return (
    <div className="grid gap-4">
      {limits.map((limit) => (
        <SeatRow key={`${limit.vehicleType}-${limit.seats}`} limit={limit} />
      ))}
    </div>
  );
}

function SeatRow({ limit }: { limit: SeatLimit }) {
  const router = useRouter();
  const [seats, setSeats] = useState(String(limit.seats));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/vehicle-seats/${limit.vehicleType}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ seats: Number(seats) }),
      });
      if (!response.ok) {
        setError(await errorFrom(response, "The seat limit could not be saved."));
        return;
      }
      setNotice("Seat limit saved.");
      router.refresh();
    } catch {
      setError("The seat limit could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_auto] sm:items-end">
      <p className="text-[0.9375rem] font-semibold text-ink">{TYPE_LABELS[limit.vehicleType] ?? limit.vehicleType}</p>
      <label className={`grid gap-1.5 ${LABEL}`}>
        Students per session
        <input type="number" min={1} max={20} step={1} value={seats} onChange={(event) => setSeats(event.target.value)} className={FIELD} required />
      </label>
      <button type="submit" disabled={busy || seats === String(limit.seats)} className={BUTTON_INK}>
        {busy ? "Saving…" : "Save"}
      </button>
      {notice && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] text-success sm:col-span-full">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700 sm:col-span-full">
          {error}
        </p>
      )}
    </form>
  );
}
