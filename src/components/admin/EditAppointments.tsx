"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";
import { DateAndTimeFields, describeWhen, schoolDateAndTime } from "@/components/admin/AddAppointmentForms";
import ConfirmDialog from "@/components/student/ConfirmDialog";
import { formatDateTime, labels } from "@/components/student/format";

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Outcome buttons and confirmation shared by both kinds of record. */
function OutcomeButtons({
  busy,
  onOutcome,
}: {
  busy: boolean;
  onOutcome: (status: "COMPLETED" | "CANCELLED") => void;
}) {
  const [pending, setPending] = useState<"COMPLETED" | "CANCELLED" | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="button" onClick={() => setPending("COMPLETED")} disabled={busy} className={`${BUTTON_SECONDARY} h-10 px-4`}>
          Mark as completed
        </button>
        <button type="button" onClick={() => setPending("CANCELLED")} disabled={busy} className={`${BUTTON_DANGER} h-10 px-4`}>
          Cancel
        </button>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending === "CANCELLED" ? "Cancel this record?" : "Mark this record as completed?"}
        confirmLabel={pending === "CANCELLED" ? "Cancel record" : "Mark completed"}
        busy={busy}
        onConfirm={() => {
          if (pending) onOutcome(pending);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      >
        <p>
          {pending === "CANCELLED"
            ? "The record will be marked as cancelled and removed from the upcoming list. Its history is kept."
            : "The record will be marked as completed and removed from the upcoming list."}
        </p>
      </ConfirmDialog>
    </>
  );
}

/** One row in the upcoming list, with an Edit button that opens the change form. */
function Row({ title, meta, when, editing, onToggle, children }: { title: string; meta: string; when: string; editing: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <li className="grid gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-bold text-ink">{when}</p>
          <p className="text-[0.8125rem] text-muted">
            {title}
            {meta ? ` · ${meta}` : ""}
          </p>
        </div>
        <button type="button" onClick={onToggle} className={`${BUTTON_SECONDARY} h-9 px-4`} aria-expanded={editing}>
          {editing ? "Close" : "Edit"}
        </button>
      </div>
      {editing && children}
    </li>
  );
}

export type MedicalItem = { id: string; appointmentDate: string; status: string };
export type ExamItem = { id: string; examType: string; vehicleType: string | null; scheduledDate: string; status: string };

export function MedicalItemList({ studentId, items }: { studentId: string; items: MedicalItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="mt-2 grid gap-3">
      {items.map((item) => (
        <Row
          key={item.id}
          title="Medical appointment"
          meta={labels.medicalStatus[item.status] ?? item.status}
          when={formatDateTime(new Date(item.appointmentDate))}
          editing={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
        >
          <MedicalEditor studentId={studentId} item={item} onDone={() => setOpenId(null)} />
        </Row>
      ))}
    </ul>
  );
}

export function ExamItemList({ studentId, items }: { studentId: string; items: ExamItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="mt-2 grid gap-3">
      {items.map((item) => (
        <Row
          key={item.id}
          title={labels.examType[item.examType] ?? item.examType}
          meta={item.vehicleType ? (labels.vehicleType[item.vehicleType] ?? item.vehicleType) : "No vehicle type"}
          when={formatDateTime(new Date(item.scheduledDate))}
          editing={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
        >
          <ExamEditor studentId={studentId} item={item} onDone={() => setOpenId(null)} />
        </Row>
      ))}
    </ul>
  );
}

function MedicalEditor({ studentId, item, onDone }: { studentId: string; item: MedicalItem; onDone: () => void }) {
  const router = useRouter();
  const current = schoolDateAndTime(item.appointmentDate);
  const [date, setDate] = useState(current.date);
  const [time, setTime] = useState(current.time);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dateChanged = date !== current.date || time !== current.time;
  const summary = describeWhen(date, time);

  async function send(body: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/medical-appointments/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await errorFrom(response, fallback));
      onDone();
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const body: Record<string, unknown> = {};
    if (dateChanged) body.appointmentDate = `${date}T${time}`;
    if (dateChanged && reason.trim()) body.reason = reason.trim();
    if (note.trim()) body.description = note.trim();
    if (Object.keys(body).length === 0) {
      onDone();
      return;
    }
    void send(body, "The appointment could not be saved.");
  }

  return (
    <div className="grid gap-4">
      <DateAndTimeFields idPrefix={`med-${item.id}`} date={date} time={time} onDate={setDate} onTime={setTime} disabled={busy} />
      {dateChanged && (
        <div className="grid gap-1.5">
          <label htmlFor={`med-reason-${item.id}`} className={LABEL}>
            Reason for the new date <span className="font-normal text-muted">(optional, kept in the history)</span>
          </label>
          <input id={`med-reason-${item.id}`} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} disabled={busy} className={`${FIELD} h-11`} />
        </div>
      )}
      <div className="grid gap-1.5">
        <label htmlFor={`med-note-${item.id}`} className={LABEL}>
          Replace the note <span className="font-normal text-muted">(leave empty to keep the current note)</span>
        </label>
        <textarea id={`med-note-${item.id}`} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} className={`${FIELD} py-2.5`} />
      </div>
      <p className="text-[0.8125rem] text-muted">{summary ? `New date: ${summary}` : "Choose a date and a time."}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy || !summary} className={`${BUTTON_PRIMARY} h-10 px-5`}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
      <OutcomeButtons busy={busy} onOutcome={(status) => void send({ status }, "The appointment could not be updated.")} />
      {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
    </div>
  );
}

function ExamEditor({ studentId, item, onDone }: { studentId: string; item: ExamItem; onDone: () => void }) {
  const router = useRouter();
  const current = schoolDateAndTime(item.scheduledDate);
  const [examType, setExamType] = useState(item.examType);
  const [vehicleType, setVehicleType] = useState(item.vehicleType ?? "");
  const [date, setDate] = useState(current.date);
  const [time, setTime] = useState(current.time);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dateChanged = date !== current.date || time !== current.time;
  const summary = describeWhen(date, time);

  async function send(body: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/exams/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await errorFrom(response, fallback));
      onDone();
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const body: Record<string, unknown> = {};
    if (examType !== item.examType) body.examType = examType;
    if ((vehicleType || null) !== (item.vehicleType ?? null)) body.vehicleType = vehicleType || null;
    if (dateChanged) {
      body.scheduledDate = `${date}T${time}`;
      if (reason.trim()) body.reason = reason.trim();
    }
    if (Object.keys(body).length === 0) {
      onDone();
      return;
    }
    void send(body, "The exam could not be saved.");
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor={`exam-type-${item.id}`} className={LABEL}>
            Exam type
          </label>
          <select id={`exam-type-${item.id}`} value={examType} onChange={(event) => setExamType(event.target.value)} disabled={busy} className={`${SELECT_FIELD} h-11`}>
            {Object.entries(labels.examType).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`exam-vehicle-${item.id}`} className={LABEL}>
            Vehicle type
          </label>
          <select id={`exam-vehicle-${item.id}`} value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} disabled={busy} className={`${SELECT_FIELD} h-11`}>
            <option value="">Not for a specific vehicle</option>
            {Object.entries(labels.vehicleType).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <DateAndTimeFields idPrefix={`exam-${item.id}`} date={date} time={time} onDate={setDate} onTime={setTime} disabled={busy} />
      {dateChanged && (
        <div className="grid gap-1.5">
          <label htmlFor={`exam-reason-${item.id}`} className={LABEL}>
            Reason for the new date <span className="font-normal text-muted">(optional, kept in the history)</span>
          </label>
          <input id={`exam-reason-${item.id}`} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} disabled={busy} className={`${FIELD} h-11`} />
        </div>
      )}
      <p className="text-[0.8125rem] text-muted">{summary ? `New date: ${summary}` : "Choose a date and a time."}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy || !summary} className={`${BUTTON_PRIMARY} h-10 px-5`}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
      <OutcomeButtons busy={busy} onOutcome={(status) => void send({ status }, "The exam could not be updated.")} />
      {error && <p role="alert" className="text-[0.875rem] text-red-700">{error}</p>}
    </div>
  );
}
