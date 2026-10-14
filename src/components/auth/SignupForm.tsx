"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import PackageSelect from "@/components/auth/PackageSelect";
import { packageDiscountNote } from "@/data/packages";

type Values = {
  fullName: string;
  dateOfBirth: string;
  nic: string;
  mobile: string;
  address: string;
  packageId: string;
  notes: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const initialValues: Values = {
  fullName: "",
  dateOfBirth: "",
  nic: "",
  mobile: "",
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

/** Student registration form. Validates the fields; submission is not connected to a server yet. */
export default function SignupForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const router = useRouter();

  function update(field: keyof Values) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  // Only the package id travels to the payment step; personal details are not put in the URL.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      router.push(`/payment?package=${encodeURIComponent(values.packageId)}`);
    }
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
          onChange={(packageId) => setValues((current) => ({ ...current, packageId }))}
          invalid={Boolean(errors.packageId)}
        />
      </Field>

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

      <button
        type="submit"
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
      >
        Register
        <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
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
