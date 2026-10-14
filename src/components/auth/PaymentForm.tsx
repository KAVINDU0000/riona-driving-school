"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { allowedSlipTypes, maxSlipBytes, paymentMethods } from "@/data/payment";
import { formatLkr } from "@/data/packages";

export interface SelectedPackage {
  id: string;
  name: string;
  detail?: string;
  price: number;
  group: string;
}

interface PaymentFormProps {
  pkg: SelectedPackage;
}

type BankFields = { bankName: string; accountName: string; accountNumber: string; branch: string };
type FormErrors = Partial<Record<keyof BankFields | "paymentDate" | "slip", string>>;

const emptyBank: BankFields = { bankName: "", accountName: "", accountNumber: "", branch: "" };

const inputBase =
  "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[0.8125rem] text-red-600">
          <Icon name="info" className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Payment step: shows the selected package and bank details, then collects the payment slip. Submission is not connected to a server yet. */
export default function PaymentForm({ pkg }: PaymentFormProps) {
  const [method, setMethod] = useState<string>(paymentMethods[0].value);
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [bank, setBank] = useState<BankFields>(emptyBank);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState("");

  function updateBank(field: keyof BankFields) {
    return (event: ChangeEvent<HTMLInputElement>) => setBank((current) => ({ ...current, [field]: event.target.value }));
  }

  function handleSlipChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSlip(file);
    if (!file) return;
    if (!allowedSlipTypes.includes(file.type)) {
      setErrors((current) => ({ ...current, slip: "Upload a JPG, PNG or PDF file." }));
      setSlip(null);
    } else if (file.size > maxSlipBytes) {
      setErrors((current) => ({ ...current, slip: "The file is larger than 5 MB. Upload a smaller file." }));
      setSlip(null);
    } else {
      setErrors((current) => ({ ...current, slip: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!bank.bankName.trim()) nextErrors.bankName = "Enter the name of your bank.";
    if (!bank.accountName.trim()) nextErrors.accountName = "Enter the account holder's name.";
    if (!/^\d{6,20}$/.test(bank.accountNumber.replace(/\s/g, ""))) nextErrors.accountNumber = "Enter a valid account number (digits only).";
    if (!bank.branch.trim()) nextErrors.branch = "Enter your bank branch.";
    if (!paymentDate) nextErrors.paymentDate = "Select the date you made the payment.";
    if (!slip) nextErrors.slip = errors.slip ?? "Upload a photo or PDF of your payment slip.";
    setErrors(nextErrors);
    setNotice(Object.keys(nextErrors).length ? "" : "Payment submission is not connected to a server yet.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-6">
      {/* Selected package */}
      <div className="rounded-2xl bg-page p-5 ring-1 ring-line">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">Your selected package</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[1.0625rem] font-bold text-ink">
              {pkg.name}
              {pkg.detail ? ` (${pkg.detail})` : ""}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">{pkg.group}</p>
          </div>
          <p className="text-[1.375rem] font-bold text-success">{formatLkr(pkg.price)}</p>
        </div>
      </div>

      {/* Student's own bank details */}
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-[1.0625rem] font-bold text-ink">1. Your bank details</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">Enter the details of the bank account you pay from.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="bankName" label="Bank name *" error={errors.bankName}>
            <div className="relative">
              <Icon name="wallet" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="bankName"
                name="bankName"
                placeholder="e.g. Bank of Ceylon"
                value={bank.bankName}
                onChange={updateBank("bankName")}
                aria-invalid={Boolean(errors.bankName)}
                className={`${inputBase} ${errors.bankName ? "border-red-400" : "border-line"}`}
              />
            </div>
          </Field>

          <Field id="accountName" label="Account holder name *" error={errors.accountName}>
            <div className="relative">
              <Icon name="user" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="accountName"
                name="accountName"
                placeholder="As printed on the account"
                value={bank.accountName}
                onChange={updateBank("accountName")}
                aria-invalid={Boolean(errors.accountName)}
                className={`${inputBase} ${errors.accountName ? "border-red-400" : "border-line"}`}
              />
            </div>
          </Field>

          <Field id="accountNumber" label="Account number *" error={errors.accountNumber}>
            <div className="relative">
              <Icon name="id-card" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="accountNumber"
                name="accountNumber"
                inputMode="numeric"
                placeholder="Digits only"
                value={bank.accountNumber}
                onChange={updateBank("accountNumber")}
                aria-invalid={Boolean(errors.accountNumber)}
                className={`${inputBase} ${errors.accountNumber ? "border-red-400" : "border-line"}`}
              />
            </div>
          </Field>

          <Field id="branch" label="Branch *" error={errors.branch}>
            <div className="relative">
              <Icon name="map-pin" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="branch"
                name="branch"
                placeholder="e.g. Colombo Fort"
                value={bank.branch}
                onChange={updateBank("branch")}
                aria-invalid={Boolean(errors.branch)}
                className={`${inputBase} ${errors.branch ? "border-red-400" : "border-line"}`}
              />
            </div>
          </Field>
        </div>
      </div>

      {/* Payment details */}
      <div className="flex flex-col gap-5">
        <h2 className="text-[1.0625rem] font-bold text-ink">2. Payment details</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[0.8125rem] font-semibold text-ink">Payment method</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {paymentMethods.map((item) => {
              const selected = method === item.value;
              return (
                <label
                  key={item.value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-4 py-3 transition-all ${
                    selected ? "border-gold-dark bg-gold-soft/60 ring-4 ring-gold/20" : "border-line bg-white hover:border-gold/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={item.value}
                      checked={selected}
                      onChange={() => setMethod(item.value)}
                      className="accent-[var(--color-gold-dark)]"
                    />
                    <span className="text-[0.9375rem] font-semibold text-ink">{item.label}</span>
                  </span>
                  <span className="pl-6 text-[0.8125rem] text-muted">{item.detail}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-semibold text-ink">Amount to pay</span>
            <div className="flex h-12 items-center rounded-xl border border-line bg-page px-4 text-[0.9375rem] font-semibold text-ink">
              {formatLkr(pkg.price)}
            </div>
          </div>

          <Field id="paymentDate" label="Payment date *" error={errors.paymentDate}>
            <div className="relative">
              <Icon name="calendar" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="paymentDate"
                name="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                aria-invalid={Boolean(errors.paymentDate)}
                className={`${inputBase} ${paymentDate ? "text-ink" : "text-muted/70"} ${
                  errors.paymentDate ? "border-red-400" : "border-line"
                }`}
              />
            </div>
          </Field>
        </div>

        <Field id="reference" label="Bank reference / transaction number (optional)">
          <div className="relative">
            <Icon name="info" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <input
              id="reference"
              name="reference"
              placeholder="Enter the reference number if available"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={`${inputBase} border-line`}
            />
          </div>
        </Field>

        <Field id="slip" label="Upload payment slip *" error={errors.slip}>
          <label
            htmlFor="slip"
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors hover:border-gold-dark hover:bg-gold-soft/40 ${
              errors.slip ? "border-red-400" : "border-line bg-white"
            }`}
          >
            <Icon name="file-check" className="h-6 w-6 text-gold-ink" />
            <span className="text-[0.9375rem] font-semibold text-ink">
              {slip ? slip.name : "Choose a file to upload"}
            </span>
            <span className="text-[0.8125rem] text-muted">JPG, PNG or PDF, up to 5 MB</span>
            <input
              id="slip"
              name="slip"
              type="file"
              accept={allowedSlipTypes.join(",")}
              onChange={handleSlipChange}
              className="sr-only"
            />
          </label>
        </Field>
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
      >
        Submit payment
        <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
      </button>

      {notice && (
        <p role="status" className="rounded-xl bg-gold-soft px-4 py-3 text-[0.8125rem] font-medium text-gold-ink">
          {notice}
        </p>
      )}

      <div className="rounded-2xl bg-page p-4 ring-1 ring-line">
        <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-ink">
          <Icon name="info" className="h-4 w-4 text-gold-ink" />
          What happens next?
        </p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
          The driving school reviews your payment slip. Your student ID is issued after approval and sent to you by
          WhatsApp or phone.
        </p>
      </div>
    </form>
  );
}
