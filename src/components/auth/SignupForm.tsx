"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import PackageSelect from "@/components/auth/PackageSelect";
import { findPackage, formatPackagePrice, isPerSession, packageDiscountNote } from "@/data/packages";

type Values = {
  fullName: string;
  dateOfBirth: string;
  nic: string;
  mobile: string;
  email: string;
  password: string;
  address: string;
  packageId: string;
  notes: string;
};

type Errors = Partial<Record<keyof Values, string>>;

// Same limits as the server (src/lib/auth/password.ts and src/lib/auth/http.ts). Kept here so this
// client component does not import server-only modules.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const PER_SESSION_MESSAGE = "This package is charged per session. Contact the school to register for it.";

const initialValues: Values = {
  fullName: "",
  dateOfBirth: "",
  nic: "",
  mobile: "",
  email: "",
  password: "",
  address: "",
  packageId: "",
  notes: "",
};

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.fullName.trim()) errors.fullName = "Enter your full name as on NIC.";
  if (!values.dateOfBirth) errors.dateOfBirth = "Select your date of birth.";
  if (!/^(\d{9}[VvXx]|\d{12})$/.test(values.nic.trim())) errors.nic = "Enter a valid NIC number.";
  if (!/^0\d{9}$/.test(values.mobile.replace(/\s/g, ""))) errors.mobile = "Enter a valid 10-digit mobile number, e.g. 0771234567.";
  const email = values.email.trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (values.password.length < PASSWORD_MIN_LENGTH || values.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!values.address.trim()) errors.address = "Enter your residential address.";
  if (!values.packageId) errors.packageId = "Select a training package.";
  return errors;
}

const inputBase =
  "w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-colors focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-[0.8125rem] text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[0.8125rem] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Student registration form. Validates the fields here and again on the server, then posts to /api/registration. */
export default function SignupForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  function update(field: keyof Values) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  // Per-session packages show their rate but cannot be registered online until the school sets a policy.
  const selectedPackage = findPackage(values.packageId);
  const perSessionPackage = selectedPackage && isPerSession(selectedPackage) ? selectedPackage : null;

  // Server field names differ from the form's field names in these places only.
  const serverField: Partial<Record<keyof Values, string>> = {
    dateOfBirth: "birthday",
    nic: "nicNumber",
    mobile: "phoneNumber",
    notes: "additionalNote",
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setServerError("");
    const nextErrors = validate(values);
    if (perSessionPackage) nextErrors.packageId = PER_SESSION_MESSAGE;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          fullName: values.fullName,
          birthday: values.dateOfBirth,
          nicNumber: values.nic,
          phoneNumber: values.mobile,
          email: values.email,
          password: values.password,
          address: values.address,
          packageId: values.packageId,
          additionalNote: values.notes,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        referenceNumber?: string;
        fields?: Partial<Record<string, string>>;
      };

      if (response.ok && data.referenceNumber) {
        setReference(data.referenceNumber);
        return;
      }

      // Put server-side field messages next to the matching inputs, and keep the rest as one message.
      const fieldErrors: Errors = {};
      for (const key of Object.keys(initialValues) as (keyof Values)[]) {
        const message = data.fields?.[serverField[key] ?? key];
        if (message) fieldErrors[key] = message;
      }
      setErrors(fieldErrors);
      setServerError(data.error ?? "Your application could not be submitted. Try again.");
    } catch {
      setServerError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="flex flex-col gap-5" role="status">
        <div>
          <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Application received</h2>
          <p className="mt-1.5 text-[0.875rem] text-muted">
            Keep this reference number. The school will review your application and contact you on your mobile number.
          </p>
        </div>
        <p className="rounded-2xl bg-success-soft px-5 py-4 text-[1.125rem] font-bold tracking-[0.04em] text-success">{reference}</p>
        <p className="rounded-xl bg-gold-soft px-4 py-3 text-[0.875rem] text-gold-ink">
          No payment has been recorded yet. Payment is confirmed separately by the school.
        </p>
        <Link
          href={`/payment?package=${encodeURIComponent(values.packageId)}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink hover:bg-gold-dark"
        >
          Continue to payment
        </Link>
      </div>
    );
  }

  const borderFor = (field: keyof Values) => (errors[field] ? "border-red-400" : "border-line");
  const iconClass = "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted";

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-5">
      <div>
        <h2 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-ink">Student Registration</h2>
        <p className="mt-1.5 text-[0.875rem] text-muted">Enter your details and choose a training package.</p>
      </div>

      <Field id="fullName" label="Full name *" error={errors.fullName}>
        <div className="relative">
          <Icon name="user" className={iconClass} />
          <input
            id="fullName"
            name="fullName"
            autoComplete="off"
            placeholder="Enter your full name as on NIC"
            value={values.fullName}
            onChange={update("fullName")}
            aria-invalid={Boolean(errors.fullName)}
            className={`h-12 ${inputBase} ${borderFor("fullName")}`}
          />
        </div>
      </Field>

      <Field id="dateOfBirth" label="Date of birth *" error={errors.dateOfBirth}>
        <div className="relative">
          <Icon name="calendar" className={iconClass} />
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={values.dateOfBirth}
            onChange={update("dateOfBirth")}
            aria-invalid={Boolean(errors.dateOfBirth)}
            className={`h-12 ${inputBase} ${values.dateOfBirth ? "text-ink" : "text-muted/70"} ${borderFor("dateOfBirth")}`}
          />
        </div>
      </Field>

      <Field id="nic" label="NIC number *" error={errors.nic}>
        <div className="relative">
          <Icon name="id-card" className={iconClass} />
          <input
            id="nic"
            name="nic"
            placeholder="Enter your NIC number"
            value={values.nic}
            onChange={update("nic")}
            aria-invalid={Boolean(errors.nic)}
            className={`h-12 ${inputBase} ${borderFor("nic")}`}
          />
        </div>
      </Field>

      <Field id="mobile" label="Mobile number *" error={errors.mobile}>
        <div className="relative">
          <Icon name="phone" className={iconClass} />
          <input
            id="mobile"
            name="mobile"
            type="tel"
            autoComplete="off"
            placeholder="e.g. 0771234567"
            value={values.mobile}
            onChange={update("mobile")}
            aria-invalid={Boolean(errors.mobile)}
            className={`h-12 ${inputBase} ${borderFor("mobile")}`}
          />
        </div>
      </Field>

      <Field id="email" label="Email address *" error={errors.email}>
        <div className="relative">
          <Icon name="mail" className={iconClass} />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            inputMode="email"
            placeholder="name@example.com"
            value={values.email}
            onChange={update("email")}
            aria-invalid={Boolean(errors.email)}
            className={`h-12 ${inputBase} ${borderFor("email")}`}
          />
        </div>
      </Field>

      <Field id="password" label="Password *" error={errors.password} hint={`${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`}>
        <div className="relative">
          <Icon name="lock" className={iconClass} />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={values.password}
            onChange={update("password")}
            aria-invalid={Boolean(errors.password)}
            className={`h-12 ${inputBase} ${borderFor("password")}`}
          />
        </div>
      </Field>

      <Field id="address" label="Residential address *" error={errors.address}>
        <div className="relative">
          <Icon name="map-pin" className="pointer-events-none absolute left-4 top-4 h-[18px] w-[18px] text-muted" />
          <textarea
            id="address"
            name="address"
            rows={3}
            placeholder="Enter your full residential address"
            value={values.address}
            onChange={update("address")}
            aria-invalid={Boolean(errors.address)}
            className={`${inputBase} resize-none py-3 ${borderFor("address")}`}
          />
        </div>
      </Field>

      <Field id="packageId" label="Select training package *" error={errors.packageId} hint={packageDiscountNote}>
        <PackageSelect
          id="packageId"
          value={values.packageId}
          onChange={(packageId) => {
            setServerError("");
            setValues((current) => ({ ...current, packageId }));
          }}
          invalid={Boolean(errors.packageId)}
        />
      </Field>

      {perSessionPackage && (
        <div role="note" className="rounded-xl bg-gold-soft px-4 py-3 text-[0.875rem] text-gold-ink">
          <p className="font-semibold">{perSessionPackage.name} is charged per session: {formatPackagePrice(perSessionPackage)}.</p>
          <p className="mt-1">
            Online registration is not available for per-session packages yet. Contact the school to register for this package.
          </p>
        </div>
      )}

      <Field id="notes" label="Additional notes (optional)">
        <div className="relative">
          <Icon name="info" className="pointer-events-none absolute left-4 top-4 h-[18px] w-[18px] text-muted" />
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Anything else the driving school should know"
            value={values.notes}
            onChange={update("notes")}
            className={`${inputBase} resize-none py-3 border-line`}
          />
        </div>
      </Field>

      {serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || Boolean(perSessionPackage)}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Register"}
        {!submitting && <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />}
      </button>

      <div className="text-center text-[0.8125rem] text-muted">
        Already registered?{" "}
        <Link href="/login?role=student" className="font-semibold text-gold-ink hover:text-ink">
          Sign in
        </Link>
      </div>
    </form>
  );
}
