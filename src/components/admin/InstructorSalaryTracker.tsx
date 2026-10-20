"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, type FormEvent, type ReactNode } from "react";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD } from "@/components/admin/admin-ui";
import { formatDate } from "@/components/student/format";

export type SalaryMonth = {
  id: string;
  month: string;
  amount: string;
  status: "PAID" | "UNPAID";
  paidOn: string | null;
  note: string | null;
};

async function errorFrom(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function formatAmount(value: number | string) {
  return `LKR ${Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** A card at the top of the section: a small label, a large value and an optional line of detail. */
function StatCard({ label, accent, children }: { label: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-gold/50 bg-gold-soft/40" : "border-line bg-white"}`}>
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * Monthly salary for one instructor. The fixed salary is the default for new months. Each month is recorded once, then
 * marked paid with the paid date, or unpaid again. Changing the fixed salary never changes months already recorded.
 */
export default function InstructorSalaryTracker({
  instructorId,
  monthlySalary,
  months,
  currentMonth,
  today,
}: {
  instructorId: string;
  monthlySalary: string | null;
  months: SalaryMonth[];
  /** The current school month as YYYY-MM. Later months cannot be recorded. */
  currentMonth: string;
  /** Today in school time, as YYYY-MM-DD. Used as the default paid date. */
  today: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState(monthlySalary ?? "");
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [amountInput, setAmountInput] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidOnInput, setPaidOnInput] = useState(today);
  const [noteInput, setNoteInput] = useState("");

  const base = `/api/admin/instructors/${encodeURIComponent(instructorId)}/salary`;

  async function send(path: string, method: "PUT" | "POST" | "PATCH", body: unknown, done: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await errorFrom(response, "The change could not be saved."));
      setNotice(done);
      setPayingId(null);
      setEditingSalary(false);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function saveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(base, "PUT", { monthlySalary: salaryInput.trim() || null }, "Fixed salary saved. Recorded months keep their amounts.");
  }

  function recordMonth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: { month: string; amount?: string } = { month: monthInput };
    if (amountInput.trim()) body.amount = amountInput.trim();
    setAmountInput("");
    void send(base, "POST", body, `${monthLabel(monthInput)} recorded as unpaid.`);
  }

  function markPaid(id: string) {
    void send(`${base}/${encodeURIComponent(id)}`, "PATCH", { status: "PAID", paidOn: paidOnInput, note: noteInput }, "Marked as paid.");
  }

  function markUnpaid(id: string) {
    void send(`${base}/${encodeURIComponent(id)}`, "PATCH", { status: "UNPAID", paidOn: "", note: "" }, "Marked as unpaid.");
  }

  const paid = months.filter((month) => month.status === "PAID");
  const unpaid = months.filter((month) => month.status === "UNPAID");
  const paidTotal = paid.reduce((sum, month) => sum + Number(month.amount), 0);
  const unpaidTotal = unpaid.reduce((sum, month) => sum + Number(month.amount), 0);

  return (
    <div className="grid gap-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Fixed monthly salary">
          {editingSalary ? (
            <form onSubmit={saveSalary} className="grid gap-2">
              <input
                aria-label="Fixed monthly salary in rupees"
                inputMode="decimal"
                autoFocus
                value={salaryInput}
                onChange={(event) => setSalaryInput(event.target.value)}
                placeholder="For example 45000"
                className={FIELD}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={BUTTON_PRIMARY}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSalary(false);
                    setSalaryInput(monthlySalary ?? "");
                  }}
                  className={BUTTON_SECONDARY}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[1.375rem] font-bold leading-tight text-ink">
                  {monthlySalary ? formatAmount(monthlySalary) : "Not set"}
                </p>
                <p className="mt-1 text-[0.8125rem] text-muted">{monthlySalary ? "per month" : "Set it to speed up recording"}</p>
              </div>
              <button type="button" onClick={() => setEditingSalary(true)} className={BUTTON_SECONDARY}>
                {monthlySalary ? "Edit" : "Set"}
              </button>
            </div>
          )}
        </StatCard>

        <StatCard label="Paid">
          <p className="text-[1.375rem] font-bold leading-tight text-ink">{paid.length} {paid.length === 1 ? "month" : "months"}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">{paid.length > 0 ? `${formatAmount(paidTotal)} paid in total` : "Nothing paid yet"}</p>
        </StatCard>

        <StatCard label="Unpaid" accent={unpaid.length > 0}>
          <p className="text-[1.375rem] font-bold leading-tight text-ink">{unpaid.length} {unpaid.length === 1 ? "month" : "months"}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">
            {unpaid.length > 0 ? `${formatAmount(unpaidTotal)} still to pay` : "Nothing outstanding"}
          </p>
        </StatCard>
      </div>

      {/* Record a month */}
      <form onSubmit={recordMonth} className="rounded-2xl border border-line bg-page/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-1.5">
            <label htmlFor="salary-month" className="text-[0.8125rem] font-semibold text-ink">
              Record a month
            </label>
            <input
              id="salary-month"
              type="month"
              max={currentMonth}
              value={monthInput}
              onChange={(event) => setMonthInput(event.target.value)}
              className={FIELD}
            />
          </div>
          <div className="grid flex-1 gap-1.5">
            <label htmlFor="salary-amount" className="text-[0.8125rem] font-semibold text-ink">
              Amount <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="salary-amount"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={monthlySalary ? `Fixed salary, ${Number(monthlySalary).toLocaleString("en-LK")}` : "Enter an amount"}
              className={FIELD}
            />
          </div>
          <button type="submit" disabled={busy || !monthInput} className={`${BUTTON_PRIMARY} lg:shrink-0`}>
            Record month
          </button>
        </div>
        <p className="mt-3 text-[0.8125rem] text-muted">
          A month is recorded once and starts as unpaid. Future months cannot be recorded.
        </p>
      </form>

      {notice && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.875rem] font-medium text-success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] font-medium text-red-700">
          {error}
        </p>
      )}

      {/* History */}
      {months.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[0.9375rem] font-semibold text-ink">No salary months recorded yet</p>
          <p className="mt-1 text-[0.875rem] text-muted">Record the first month above to start tracking payments.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-[0.875rem]">
            <caption className="sr-only">Monthly salary for this instructor</caption>
            <thead>
              <tr className="bg-page/70 text-[0.75rem] uppercase tracking-[0.1em] text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Month</th>
                <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Paid on</th>
                <th scope="col" className="px-4 py-3 font-semibold">Note</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => {
                const isPaid = month.status === "PAID";
                return (
                  <Fragment key={month.id}>
                    <tr className="text-ink">
                      <th scope="row" className="border-t border-line px-4 py-3.5 font-semibold">
                        {monthLabel(month.month)}
                      </th>
                      <td className="border-t border-line px-4 py-3.5 tabular-nums">{formatAmount(month.amount)}</td>
                      <td className="border-t border-line px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${
                            isPaid ? "bg-success-soft text-success" : "bg-gold-soft text-gold-ink"
                          }`}
                        >
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-success" : "bg-gold-dark"}`} />
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td className="border-t border-line px-4 py-3.5 text-muted">{month.paidOn ? formatDate(month.paidOn) : "—"}</td>
                      <td className="border-t border-line px-4 py-3.5 text-muted">{month.note ?? "—"}</td>
                      <td className="border-t border-line px-4 py-3.5 text-right">
                        {isPaid ? (
                          <button type="button" disabled={busy} onClick={() => markUnpaid(month.id)} className={BUTTON_SECONDARY}>
                            Mark unpaid
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            aria-expanded={payingId === month.id}
                            onClick={() => {
                              setPayingId(payingId === month.id ? null : month.id);
                              setPaidOnInput(today);
                              setNoteInput("");
                            }}
                            className={BUTTON_PRIMARY}
                          >
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                    {payingId === month.id && (
                      <tr>
                        <td colSpan={6} className="bg-gold-soft/30 px-4 py-4">
                          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                            <div className="grid gap-1.5">
                              <label htmlFor={`paid-on-${month.id}`} className="text-[0.8125rem] font-semibold text-ink">
                                Paid on
                              </label>
                              <input
                                id={`paid-on-${month.id}`}
                                type="date"
                                max={today}
                                value={paidOnInput}
                                onChange={(event) => setPaidOnInput(event.target.value)}
                                className={FIELD}
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <label htmlFor={`note-${month.id}`} className="text-[0.8125rem] font-semibold text-ink">
                                Note <span className="font-normal text-muted">(optional)</span>
                              </label>
                              <input
                                id={`note-${month.id}`}
                                value={noteInput}
                                onChange={(event) => setNoteInput(event.target.value)}
                                placeholder="For example, bank transfer reference"
                                className={FIELD}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" disabled={busy || !paidOnInput} onClick={() => markPaid(month.id)} className={BUTTON_PRIMARY}>
                                Save
                              </button>
                              <button type="button" onClick={() => setPayingId(null)} className={BUTTON_SECONDARY}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

