"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { formatDate, formatDateTime, labels } from "@/components/student/format";
import StatusBadge from "@/components/student/StatusBadge";
import type { RequirementStatus } from "@/lib/admin/requirements";
import { formatLkr } from "@/lib/packages/format";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";

/** Compact control for the requirement table, sized to sit inside a row. */
const COMPACT_FIELD = `${FIELD} h-10 w-28 py-2`;

export type RequirementRowView = {
  vehicleType: string;
  trainingType: string;
  requiredSessions: number | null;
};

export type AdminPackageRow = {
  id: string;
  name: string;
  packageType: string;
  price: string;
  durationDays: number | null;
  sessionDurationMinutes: number | null;
  sortOrder: number;
  isActive: boolean;
  sessionCounts: { rows: number; missing: number };
  requirements: RequirementRowView[];
  requirementsConfirmedAt: string | null;
  requirementStatus: RequirementStatus;
  applications: number;
  enrollments: number;
  priceChanges: number;
};

export type PriceChangeRow = {
  packageName: string;
  previousPrice: string;
  newPrice: string;
  changedAt: string;
  changedBy: string | null;
};

export type RequirementChangeRow = {
  packageName: string;
  vehicleType: string;
  trainingType: string;
  previous: number | null;
  next: number | null;
  changedAt: string;
  changedBy: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  TRIAL_PREPARATION: "Trial preparation",
  ADDITIONAL_VEHICLE: "Additional vehicle",
  DAILY: "Per session",
};

/** Requirement state shown as a badge. Each state has its own wording and colour. */
const REQUIREMENT_STYLE: Record<RequirementStatus, { label: string; className: string }> = {
  INCOMPLETE: { label: "Requirements incomplete", className: "bg-red-50 text-red-700 ring-red-200" },
  AWAITING_CONFIRMATION: { label: "Awaiting confirmation", className: "bg-gold-soft text-gold-ink ring-gold/60" },
  CONFIRMED: { label: "Requirements confirmed", className: "bg-success-soft text-success ring-success/30" },
  NOT_APPLICABLE: { label: "Per session: no requirements", className: "bg-page text-muted ring-line" },
};

const VEHICLES = ["CAR", "VAN", "MOTORCYCLE", "THREE_WHEELER"] as const;
const TRAININGS = ["REGULAR", "TRIAL_PREPARATION", "DAILY"] as const;
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
const MAX_SESSIONS = 500;

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Package list with a price and availability editor, session requirements per package, then the change histories. */
export default function PackageManager({
  packages,
  changes,
  requirementChanges,
}: {
  packages: AdminPackageRow[];
  changes: PriceChangeRow[];
  requirementChanges: RequirementChangeRow[];
}) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="grid gap-6">
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

      <section aria-labelledby="packages-heading" className="glass rounded-[22px] p-5">
        <h2 id="packages-heading" className="text-[1.125rem] font-bold text-ink">
          Packages
        </h2>
        <p className="mt-2 text-[0.875rem] text-muted">
          Lower sort order appears first on the public site. Turning a package off stops new applications for it. Existing
          applications and enrollments are not changed. Online approval needs confirmed session requirements.
        </p>
        <ul className="mt-5 grid gap-4">
          {packages.map((row) => (
            <PackageRowForm
              key={row.id}
              row={row}
              onMessage={(message) => {
                setError("");
                setNotice(message);
              }}
              onError={(message) => {
                setNotice("");
                setError(message);
              }}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="requirement-history-heading" className="glass rounded-[22px] p-5">
        <h2 id="requirement-history-heading" className="text-[1.125rem] font-bold text-ink">
          Session requirement history
        </h2>
        {requirementChanges.length === 0 ? (
          <p className="mt-4 text-[0.9375rem] text-muted">No session requirements have been changed yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {requirementChanges.map((change, index) => (
              <li key={`${change.changedAt}-${index}`} className="rounded-xl bg-white px-3.5 py-2.5 text-[0.875rem] ring-1 ring-line">
                <span className="font-semibold text-ink">{change.packageName}</span>{" "}
                <span className="text-ink">
                  {labels.vehicleType[change.vehicleType]} · {labels.trainingType[change.trainingType]}:{" "}
                  {change.previous === null ? "none" : change.previous} → {change.next === null ? "removed" : change.next}
                </span>
                <span className="block text-[0.8125rem] text-muted">
                  {formatDateTime(new Date(change.changedAt))}
                  {change.changedBy ? ` · by ${change.changedBy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="price-history-heading" className="glass rounded-[22px] p-5">
        <h2 id="price-history-heading" className="text-[1.125rem] font-bold text-ink">
          Price history
        </h2>
        {changes.length === 0 ? (
          <p className="mt-4 text-[0.9375rem] text-muted">No prices have been changed from this page yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {changes.map((change, index) => (
              <li key={`${change.changedAt}-${index}`} className="rounded-xl bg-white px-3.5 py-2.5 text-[0.875rem] ring-1 ring-line">
                <span className="font-semibold text-ink">{change.packageName}</span>{" "}
                <span className="text-ink">
                  {formatLkr(Number(change.previousPrice))} → {formatLkr(Number(change.newPrice))}
                </span>
                <span className="block text-[0.8125rem] text-muted">
                  {formatDateTime(new Date(change.changedAt))}
                  {change.changedBy ? ` · by ${change.changedBy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

function PackageRowForm({
  row,
  onMessage,
  onError,
}: {
  row: AdminPackageRow;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(row.price);
  const [sortOrder, setSortOrder] = useState(String(row.sortOrder));
  const [isActive, setIsActive] = useState(row.isActive);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const newPrice = price.trim();
  const priceChanged = PRICE_PATTERN.test(newPrice) && Number(newPrice).toFixed(2) !== row.price;
  const badge = REQUIREMENT_STYLE[row.requirementStatus];

  function validate(): { price: string; sortOrder: number } | null {
    if (!PRICE_PATTERN.test(newPrice)) {
      setFieldError("Enter an amount in LKR with no more than two decimals, for example 26000 or 26000.50.");
      return null;
    }
    const order = Number(sortOrder);
    if (!Number.isInteger(order) || order < 0 || order > 9999) {
      setFieldError("Sort order must be a whole number from 0 to 9999.");
      return null;
    }
    setFieldError("");
    return { price: Number(newPrice).toFixed(2), sortOrder: order };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valid = validate();
    if (!valid) return;
    if (priceChanged) {
      setConfirming(true);
      return;
    }
    void save(valid);
  }

  async function save(valid: { price: string; sortOrder: number }) {
    setBusy(true);
    setConfirming(false);
    try {
      const response = await fetch(`/api/admin/packages/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...valid, expectedPrice: row.price, isActive }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The package could not be saved."));
      onMessage(`${row.name} saved.`);
      router.refresh();
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : "The package could not be saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,27,48,0.04)]">
      <form onSubmit={onSubmit} className="grid gap-4" aria-label={`Edit ${row.name}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">{row.name}</p>
            <p className="text-[0.8125rem] text-muted">
              {TYPE_LABELS[row.packageType] ?? row.packageType}
              {row.durationDays ? ` · ${row.durationDays} days` : ""}
              {row.sessionDurationMinutes ? ` · ${row.sessionDurationMinutes}-minute sessions` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[0.75rem] font-semibold ring-1 ${badge.className}`}>{badge.label}</span>
            <StatusBadge status={isActive ? "ACTIVE" : "INACTIVE"} label={isActive ? "Offered" : "Not offered"} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div className="grid gap-1.5">
            <label htmlFor={`price-${row.id}`} className={LABEL}>
              Price (LKR)
            </label>
            <input
              id={`price-${row.id}`}
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={busy}
              className={`${FIELD} h-11`}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`order-${row.id}`} className={LABEL}>
              Sort order
            </label>
            <input
              id={`order-${row.id}`}
              type="number"
              min={0}
              max={9999}
              step={1}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              disabled={busy}
              className={`${FIELD} h-11`}
            />
          </div>
          <label className="flex h-11 items-center gap-2.5 text-[0.875rem] font-semibold text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={busy}
              className="h-4 w-4 rounded border-line accent-[var(--color-gold-dark)]"
            />
            Offered to new applicants
          </label>
        </div>

        {fieldError && (
          <p role="alert" className="text-[0.8125rem] text-red-700">
            {fieldError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.8125rem] text-muted">
            {row.applications} application{row.applications === 1 ? "" : "s"} · {row.enrollments} enrollment
            {row.enrollments === 1 ? "" : "s"}
          </p>
          <button type="submit" disabled={busy} className={BUTTON_PRIMARY}>
            Save price and availability
          </button>
        </div>
      </form>

      <RequirementsEditor row={row} onMessage={onMessage} onError={onError} />

      <ConfirmDialog
        open={confirming}
        title="Change this price?"
        confirmLabel="Change price"
        busy={busy}
        onConfirm={() => {
          const valid = validate();
          if (valid) void save(valid);
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {row.name}: {formatLkr(Number(row.price))} → {formatLkr(Number(newPrice || 0))}. New applications use the new price.
          Applications and enrollments already made keep the price they were given. The change is recorded in the price history.
        </p>
      </ConfirmDialog>
    </li>
  );
}

/**
 * Session requirements for one package: one row per vehicle type and training type, each with the total sessions a
 * student must complete. Every count comes from the school. Saving a change clears the confirmation, and confirming
 * is refused while any row lacks a count.
 */
function RequirementsEditor({
  row,
  onMessage,
  onError,
}: {
  row: AdminPackageRow;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    row.requirements.map((item) => ({
      vehicleType: item.vehicleType,
      trainingType: item.trainingType,
      requiredSessions: item.requiredSessions === null ? "" : String(item.requiredSessions),
    })),
  );
  const [vehicle, setVehicle] = useState<string>(VEHICLES[0]);
  const [training, setTraining] = useState<string>(TRAININGS[0]);
  const [count, setCount] = useState("");
  const [localError, setLocalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (row.packageType === "DAILY") {
    return (
      <p className="mt-4 rounded-xl bg-page px-4 py-3 text-[0.8125rem] text-muted">
        Per-session packages are not approved online, so they have no session requirements.
      </p>
    );
  }

  const confirmed = row.requirementStatus === "CONFIRMED";
  const canConfirm = row.requirementStatus === "AWAITING_CONFIRMATION";
  const hint =
    row.requirementStatus === "INCOMPLETE"
      ? "Enter every required count, save, then confirm. Online approval is blocked until then."
      : row.requirementStatus === "AWAITING_CONFIRMATION"
        ? "Every count is entered. Confirm them so online approval can use this package."
        : `Confirmed${row.requirementsConfirmedAt ? ` on ${formatDate(row.requirementsConfirmedAt.slice(0, 10))}` : ""}. Online approval may use these counts.`;

  function addRow() {
    const key = `${vehicle}|${training}`;
    if (rows.some((item) => `${item.vehicleType}|${item.trainingType}` === key)) {
      setLocalError("That vehicle and training type is already in the list.");
      return;
    }
    const value = count.trim();
    if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > MAX_SESSIONS) {
      setLocalError(`Enter a whole number of sessions from 1 to ${MAX_SESSIONS}.`);
      return;
    }
    setLocalError("");
    setRows((current) => [...current, { vehicleType: vehicle, trainingType: training, requiredSessions: value }]);
    setCount("");
  }

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: { vehicleType: string; trainingType: string; requiredSessions: number }[] = [];
    for (const item of rows) {
      const value = item.requiredSessions.trim();
      if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > MAX_SESSIONS) {
        setLocalError(`Every row needs a whole number of sessions from 1 to ${MAX_SESSIONS}.`);
        return;
      }
      body.push({ vehicleType: item.vehicleType, trainingType: item.trainingType, requiredSessions: Number(value) });
    }
    setLocalError("");
    void save(body);
  }

  async function save(body: { vehicleType: string; trainingType: string; requiredSessions: number }[]) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/packages/${encodeURIComponent(row.id)}/requirements`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: body }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The requirements could not be saved."));
      const result = (await response.json()) as { requirements: { changed: number } };
      onMessage(
        result.requirements.changed === 0
          ? `${row.name}: no changes to save.`
          : `${row.name}: requirements saved. Confirm them before online approval can use them.`,
      );
      router.refresh();
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : "The requirements could not be saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setConfirming(false);
    try {
      const response = await fetch(`/api/admin/packages/${encodeURIComponent(row.id)}/requirements/confirm`, { method: "POST" });
      if (!response.ok) throw new Error(await errorFrom(response, "The requirements could not be confirmed."));
      onMessage(`${row.name}: requirements confirmed. Online approval can now use them.`);
      router.refresh();
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : "The requirements could not be confirmed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-4 rounded-2xl bg-page px-4 py-3 ring-1 ring-line">
      <summary className="cursor-pointer text-[0.9375rem] font-semibold text-ink">Session requirements</summary>
      <div className="mt-3 grid gap-4">
        <p className="text-[0.8125rem] text-muted">{hint}</p>

        {rows.length === 0 ? (
          <p className="text-[0.875rem] text-muted">No requirement rows yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-[0.875rem]">
            <caption className="sr-only">Session requirements for {row.name}</caption>
            <thead>
              <tr className="text-[0.75rem] uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="border-b border-line px-2 py-2 font-semibold">Vehicle</th>
                <th scope="col" className="border-b border-line px-2 py-2 font-semibold">Training</th>
                <th scope="col" className="border-b border-line px-2 py-2 font-semibold">Total sessions</th>
                <th scope="col" className="border-b border-line px-2 py-2 font-semibold">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={`${item.vehicleType}-${item.trainingType}`}>
                  <td className="border-b border-line px-2 py-2">{labels.vehicleType[item.vehicleType] ?? item.vehicleType}</td>
                  <td className="border-b border-line px-2 py-2">{labels.trainingType[item.trainingType] ?? item.trainingType}</td>
                  <td className="border-b border-line px-2 py-2">
                    <label className="sr-only" htmlFor={`count-${row.id}-${index}`}>
                      Total sessions for {labels.vehicleType[item.vehicleType]} {labels.trainingType[item.trainingType]}
                    </label>
                    <input
                      id={`count-${row.id}-${index}`}
                      type="number"
                      min={1}
                      max={MAX_SESSIONS}
                      step={1}
                      value={item.requiredSessions}
                      disabled={busy}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((other, otherIndex) =>
                            otherIndex === index ? { ...other, requiredSessions: event.target.value } : other,
                          ),
                        )
                      }
                      className={`${COMPACT_FIELD} w-24 px-3`}
                    />
                  </td>
                  <td className="border-b border-line px-2 py-2 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRows((current) => current.filter((_, otherIndex) => otherIndex !== index))}
                      className="text-[0.8125rem] font-semibold text-red-700 hover:underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
          <div className="grid gap-1.5">
            <label htmlFor={`vehicle-${row.id}`} className={LABEL}>
              Vehicle
            </label>
            <div className="relative">
              <select id={`vehicle-${row.id}`} value={vehicle} onChange={(event) => setVehicle(event.target.value)} className={`${SELECT_FIELD} h-11`}>
                {VEHICLES.map((value) => (
                  <option key={value} value={value}>
                    {labels.vehicleType[value]}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`training-${row.id}`} className={LABEL}>
              Training
            </label>
            <div className="relative">
              <select id={`training-${row.id}`} value={training} onChange={(event) => setTraining(event.target.value)} className={`${SELECT_FIELD} h-11`}>
                {TRAININGS.map((value) => (
                  <option key={value} value={value}>
                    {labels.trainingType[value]}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`new-count-${row.id}`} className={LABEL}>
              Total sessions
            </label>
            <input
              id={`new-count-${row.id}`}
              type="number"
              min={1}
              max={MAX_SESSIONS}
              step={1}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className={`${FIELD} h-11 w-28`}
            />
          </div>
          <button type="button" onClick={addRow} disabled={busy} className={`${BUTTON_SECONDARY} h-11 px-5`}>
            Add row
          </button>
        </div>

        {localError && (
          <p role="alert" className="text-[0.8125rem] text-red-700">
            {localError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={onSave}>
            <button type="submit" disabled={busy} className={`${BUTTON_SECONDARY} h-11 px-5`}>
              Save requirements
            </button>
          </form>
          {!confirmed && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy || !canConfirm}
              className={BUTTON_PRIMARY}
            >
              Confirm requirements
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Confirm these session requirements?"
        confirmLabel="Confirm requirements"
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          You are confirming that these are the school&apos;s complete session requirements for {row.name}. Applications approved
          from now on copy these counts. Existing enrollments keep the counts they were given.
        </p>
      </ConfirmDialog>
    </details>
  );
}
