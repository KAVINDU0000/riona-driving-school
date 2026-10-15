"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NO_RULES_IN_FORCE_NOTICE, VEHICLE_STATUS_LABELS } from "@/lib/admin/vehicle-labels";

type Candidate = { id: string; registrationNumber: string; make: string | null; model: string | null };
type Affected = {
  id: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  vehicleType: string;
  studentUserId: string;
  instructorUserId: string;
  candidates: Candidate[];
};
type Preview = {
  currentStatus: string;
  status: string;
  affected: Affected[];
  eligibility?: { rulesInForce: boolean; checkedRules: string[]; blockers: { rule: string; message: string }[] };
};

/** One choice per affected lesson: move it to a free vehicle, or cancel it with a reason. */
type Choice = { action: "REASSIGN"; vehicleId: string } | { action: "CANCEL"; reason: string } | undefined;

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/**
 * Status change with the future-lesson check. The admin first reviews the impact, then chooses what happens to each
 * scheduled lesson. The server saves the status and every lesson choice together, or nothing at all.
 */
export default function VehicleStatusPanel({
  vehicleId,
  currentStatus,
  expectedUpdatedAt,
}: {
  vehicleId: string;
  currentStatus: string;
  expectedUpdatedAt: string;
}) {
  const router = useRouter();
  const options = Object.keys(VEHICLE_STATUS_LABELS).filter((value) => value !== currentStatus);
  const [target, setTarget] = useState(options[0] ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function review() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}/status?status=${encodeURIComponent(target)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await errorFrom(response, "The impact could not be checked."));
      const data = (await response.json()) as Preview;
      setPreview(data);
      setChoices({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The impact could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  function setChoice(lessonId: string, choice: Choice) {
    setChoices((current) => ({ ...current, [lessonId]: choice }));
  }

  const allResolved = preview ? preview.affected.every((lesson) => choices[lesson.id]) : false;
  const blocked = (preview?.eligibility?.blockers.length ?? 0) > 0;
  const canConfirm = preview !== null && !blocked && (preview.affected.length === 0 || allResolved);

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const resolutions = preview.affected.map((lesson) => {
        const choice = choices[lesson.id]!;
        return choice.action === "REASSIGN"
          ? { lessonId: lesson.id, action: "REASSIGN", vehicleId: choice.vehicleId }
          : { lessonId: lesson.id, action: "CANCEL", reason: choice.reason };
      });
      const response = await fetch(`/api/admin/vehicles/${vehicleId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ status: preview.status, expectedUpdatedAt, resolutions }),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The status could not be changed. Review the lessons and try again."));
      setMessage(`Status changed to ${VEHICLE_STATUS_LABELS[preview.status]}.`);
      setPreview(null);
      setChoices({});
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The status could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2 text-[0.8125rem] font-semibold text-ink">
          Change status to
          <select
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              setPreview(null);
              setChoices({});
            }}
            className="rounded-xl border border-line bg-white px-3 py-2.5 text-[0.9375rem] font-normal text-ink"
          >
            {options.map((value) => (
              <option key={value} value={value}>
                {VEHICLE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || options.length === 0}
          onClick={review}
          className="rounded-xl px-5 py-2.5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page disabled:opacity-60"
        >
          Check scheduled lessons
        </button>
      </div>

      {preview && (
        <section aria-label="Scheduled lessons affected" className="grid gap-3 rounded-2xl bg-page p-4 ring-1 ring-line">
          {preview.status === "ACTIVE" && preview.eligibility && (
            <div role="status" className="grid gap-2 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
              {preview.eligibility.blockers.map((blocker) => (
                <p key={blocker.rule} className="font-semibold text-red-700">
                  {blocker.message}
                </p>
              ))}
              {!preview.eligibility.rulesInForce && <p>{NO_RULES_IN_FORCE_NOTICE}</p>}
            </div>
          )}
          {preview.affected.length === 0 ? (
            <p className="text-[0.9375rem] text-ink">No scheduled lessons use this vehicle, so the status can change now.</p>
          ) : (
            <>
              <p className="text-[0.9375rem] font-semibold text-ink">
                {preview.affected.length} scheduled lesson{preview.affected.length === 1 ? "" : "s"} use this vehicle. Choose what
                happens to each one before you confirm.
              </p>
              <ul className="grid gap-3">
                {preview.affected.map((lesson) => {
                  const choice = choices[lesson.id];
                  return (
                    <li key={lesson.id} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-line">
                      <p className="text-[0.875rem] text-ink">
                        {lesson.lessonDate}, {lesson.startTime} to {lesson.endTime} · {lesson.vehicleType}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Move lesson on ${lesson.lessonDate} ${lesson.startTime}`}
                          value={choice?.action === "REASSIGN" ? choice.vehicleId : ""}
                          onChange={(event) => {
                            if (event.target.value) setChoice(lesson.id, { action: "REASSIGN", vehicleId: event.target.value });
                          }}
                          className="rounded-xl border border-line bg-white px-3 py-2 text-[0.875rem] text-ink"
                        >
                          <option value="">Move to a free vehicle…</option>
                          {lesson.candidates.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.registrationNumber}
                              {vehicle.make ? ` · ${vehicle.make}` : ""}
                              {vehicle.model ? ` ${vehicle.model}` : ""}
                            </option>
                          ))}
                        </select>
                        <span className="text-[0.8125rem] text-muted">or</span>
                        <button
                          type="button"
                          onClick={() => setChoice(lesson.id, { action: "CANCEL", reason: choice?.action === "CANCEL" ? choice.reason : "" })}
                          className={`rounded-xl px-3 py-2 text-[0.875rem] font-semibold ring-1 ${
                            choice?.action === "CANCEL" ? "bg-red-50 text-red-700 ring-red-200" : "text-ink ring-line"
                          }`}
                        >
                          Cancel this lesson
                        </button>
                      </div>
                      {choice?.action === "CANCEL" && (
                        <label className="grid gap-1 text-[0.8125rem] font-semibold text-ink">
                          Reason (required, shown to the student, up to 300 characters)
                          <input
                            value={choice.reason}
                            maxLength={300}
                            onChange={(event) => setChoice(lesson.id, { action: "CANCEL", reason: event.target.value })}
                            className="rounded-xl border border-line bg-white px-3 py-2 text-[0.875rem] font-normal text-ink"
                          />
                        </label>
                      )}
                      {choice?.action === "REASSIGN" && (
                        <p className="text-[0.8125rem] text-success">Will move to the vehicle you chose.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!allResolved && <p className="text-[0.8125rem] text-muted">Every lesson needs a choice before you can confirm.</p>}
            </>
          )}
          <button
            type="button"
            disabled={busy || !canConfirm}
            onClick={confirm}
            className="justify-self-start rounded-xl bg-gold px-5 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-gold-dark disabled:opacity-60"
          >
            Confirm status change
          </button>
        </section>
      )}

      {message && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] font-medium text-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
