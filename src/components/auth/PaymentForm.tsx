"use client";

import { useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { allowedSlipTypes, maxSlipBytes, paymentMethods } from "@/data/payment";
import { formatLkr } from "@/lib/packages/format";
import { readApplicationReference } from "@/lib/registration/browser-reference";

export interface SelectedPackage {
  id: string;
  name: string;
  detail?: string;
  price: number;
  group?: string;
}

interface PaymentFormProps {
  pkg: SelectedPackage;
  /** The application reference, when the page already has it (the status page). Signup keeps it in the browser session. */
  applicationReference?: string;
  /** Set when the applicant resubmits from the status page, so the details they already gave are filled in again. */
  initialEmail?: string;
  initialPassword?: string;
  initialBank?: { paymentMethod?: string; bankName?: string; accountName?: string; branch?: string };
  /** Called after the server accepts a slip, so the status page can show the new state. */
  onSubmitted?: () => void;
}

type BankFields = { bankName: string; accountName: string; accountNumber: string; branch: string };
type ApplicantFields = { referenceNumber: string; email: string; password: string };
type FormErrors = Partial<
  Record<keyof BankFields | keyof ApplicantFields | "paymentDate" | "slip" | "reference", string>
>;

/** The payment method values the server accepts, matched to the options shown on this page. */
const SERVER_METHOD: Record<string, string> = { "bank-transfer": "BANK_TRANSFER", "bank-deposit": "BANK_DEPOSIT" };

const inputBase =
  "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

/** The browser session does not change while the page is open, so nothing needs to be subscribed to. */
const subscribeNothing = () => () => {};

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

/**
 * Payment step. The applicant confirms their application (reference, email and password), gives their bank
 * details and uploads the slip. The server checks all of it and records a PENDING payment for admin review.
 */
export default function PaymentForm({
  pkg,
  applicationReference,
  initialEmail,
  initialPassword,
  initialBank,
  onSubmitted,
}: PaymentFormProps) {
  const [applicant, setApplicant] = useState<Omit<ApplicantFields, "referenceNumber">>({
    email: initialEmail ?? "",
    password: initialPassword ?? "",
  });
  // The signup step saved the reference in this tab. It is read from the session and never displayed. On the
  // server, and before the page loads, the value is null, so nothing is drawn yet.
  const sessionReference = useSyncExternalStore(subscribeNothing, readApplicationReference, () => null);
  const referenceNumber = (applicationReference || sessionReference || "").trim().toUpperCase();
  const [method, setMethod] = useState<string>(
    Object.entries(SERVER_METHOD).find(([, serverValue]) => serverValue === initialBank?.paymentMethod)?.[0] ?? paymentMethods[0].value,
  );
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  // The account number is never filled in again: only the last four digits were kept, so the applicant types it.
  const [bank, setBank] = useState<BankFields>({
    bankName: initialBank?.bankName ?? "",
    accountName: initialBank?.accountName ?? "",
    accountNumber: "",
    branch: initialBank?.branch ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);

  function updateApplicant(field: keyof ApplicantFields) {
    return (event: ChangeEvent<HTMLInputElement>) => setApplicant((current) => ({ ...current, [field]: event.target.value }));
  }

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

  function checkBeforeSending(): FormErrors {
    const nextErrors: FormErrors = {};
    if (!/^RDS-[0-9A-F]{10}$/.test(referenceNumber)) nextErrors.referenceNumber = "Enter the reference number from your application.";
    if (!applicant.email.trim()) nextErrors.email = "Enter the email address you used at signup.";
    if (!applicant.password) nextErrors.password = "Enter the password you chose at signup.";
    if (!bank.bankName.trim()) nextErrors.bankName = "Enter the name of your bank.";
    if (!bank.accountName.trim()) nextErrors.accountName = "Enter the account holder's name.";
    if (!/^\d{6,20}$/.test(bank.accountNumber.replace(/\s/g, ""))) nextErrors.accountNumber = "Enter a valid account number (digits only).";
    if (!bank.branch.trim()) nextErrors.branch = "Enter your bank branch.";
    if (!paymentDate) nextErrors.paymentDate = "Select the date you made the payment.";
    if (!slip) nextErrors.slip = errors.slip ?? "Upload a photo or PDF of your payment slip.";
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = checkBeforeSending();
    setErrors(nextErrors);
    setServerError("");
    if (Object.keys(nextErrors).length > 0 || !slip) return;

    const body = new FormData();
    body.append("referenceNumber", referenceNumber);
    body.append("email", applicant.email.trim());
    body.append("password", applicant.password);
    body.append("paymentMethod", SERVER_METHOD[method] ?? "BANK_TRANSFER");
    body.append("paymentDate", paymentDate);
    body.append("reference", reference.trim());
    body.append("bankName", bank.bankName.trim());
    body.append("accountName", bank.accountName.trim());
    body.append("accountNumber", bank.accountNumber.replace(/\s/g, ""));
    body.append("branch", bank.branch.trim());
    body.append("slip", slip);

    setSubmitting(true);
    try {
      const response = await fetch("/api/registration/payment", {
        method: "POST",
        body,
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Partial<Record<string, string>>;
      };

      if (response.ok) {
        setSubmittedReference(referenceNumber);
        onSubmitted?.();
        return;
      }

      // Put each server message next to its input. The server uses the same field names as this form.
      const fieldErrors: FormErrors = {};
      for (const [name, message] of Object.entries(data.fields ?? {})) {
        if (message) fieldErrors[name as keyof FormErrors] = message;
      }
      setErrors(fieldErrors);
      setServerError(data.error ?? "Your payment slip could not be sent. Try again.");
    } catch {
      setServerError("We could not reach the server. Check your connection and try again. If you already sent it, do not send it again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedReference) {
    return (
      <div className="flex flex-col gap-5" role="status">
        <div>
          <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Payment slip received</h2>
          <p className="mt-1.5 text-[0.875rem] text-muted">Keep this reference number for your records.</p>
        </div>
        <p className="rounded-2xl bg-success-soft px-5 py-4 text-[1.125rem] font-bold tracking-[0.04em] text-success">{submittedReference}</p>
        <p className="rounded-xl bg-gold-soft px-4 py-3 text-[0.875rem] text-gold-ink">
          Your slip is waiting for review. It is not approved yet. The school will contact you on your mobile number.
        </p>
        <a href="/application-status" className="text-[0.875rem] font-semibold text-gold-ink underline underline-offset-2">
          Check your application status
        </a>
      </div>
    );
  }

  // Nothing is drawn until the session has been read, so the notice below never flashes for an applicant who has one.
  if (sessionReference === null && !applicationReference) return null;

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-6">
      {!referenceNumber && (
        <div role="status" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] leading-relaxed text-red-700">
          <p className="font-semibold">We could not find your application in this browser.</p>
          <p className="mt-1">
            Please do not sign up again, because that creates a second application. Contact the school and they will help you
            finish.
          </p>
        </div>
      )}

      {/* Selected package */}
      <div className="rounded-2xl bg-page p-5 ring-1 ring-line">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">Your selected package</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[1.0625rem] font-bold text-ink">
              {pkg.name}
              {pkg.detail ? ` (${pkg.detail})` : ""}
            </p>
            {pkg.group && <p className="mt-0.5 text-[0.8125rem] text-muted">{pkg.group}</p>}
          </div>
          <p className="text-[1.375rem] font-bold text-success">{formatLkr(pkg.price)}</p>
        </div>
      </div>

      {/* Confirm the application */}
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-[1.0625rem] font-bold text-ink">1. Confirm your application</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">Enter the email and password you chose at signup.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="email" label="Email *" error={errors.email}>
            <div className="relative">
              <Icon name="user" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="The email you used at signup"
                value={applicant.email}
                onChange={updateApplicant("email")}
                aria-invalid={Boolean(errors.email)}
                className={`${inputBase} ${errors.email ? "border-red-400" : "border-line"}`}
              />
            </div>
          </Field>

          <Field id="password" label="Password *" error={errors.password}>
            <div className="relative">
              <Icon name="id-card" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="The password you chose at signup"
                value={applicant.password}
                onChange={updateApplicant("password")}
                aria-invalid={Boolean(errors.password)}
                className={`${inputBase} ${errors.password ? "border-red-400" : "border-line"}`}
              />
            </div>
          </Field>
        </div>
      </div>

      {/* Student's own bank details */}
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-[1.0625rem] font-bold text-ink">2. Your bank details</h2>
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
        <h2 className="text-[1.0625rem] font-bold text-ink">3. Payment details</h2>

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

        <Field id="reference" label="Bank reference / transaction number (optional)" error={errors.reference}>
          <div className="relative">
            <Icon name="info" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <input
              id="reference"
              name="reference"
              placeholder="Enter the reference number if available"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              aria-invalid={Boolean(errors.reference)}
              className={`${inputBase} ${errors.reference ? "border-red-400" : "border-line"}`}
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
        disabled={submitting || !referenceNumber}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {submitting ? "Sending…" : "Submit payment"}
        {!submitting && <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />}
      </button>

      {serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] font-medium text-red-700">
          {serverError}
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
