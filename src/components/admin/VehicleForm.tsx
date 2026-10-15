"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { AUDIT_ACTION_LABELS, TRANSMISSION_LABELS, VEHICLE_STATUS_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/admin/vehicle-labels";

export type VehicleFormValues = {
  registrationNumber: string;
  vehicleType: string;
  make: string;
  model: string;
  manufacturingYear: string;
  colour: string;
  transmissionType: string;
  description: string;
  status: string;
};

type FieldName = keyof VehicleFormValues;

const EMPTY: VehicleFormValues = {
  registrationNumber: "",
  vehicleType: "CAR",
  make: "",
  model: "",
  manufacturingYear: "",
  colour: "",
  transmissionType: "NOT_APPLICABLE",
  description: "",
  status: "ACTIVE",
};

const inputClass =
  "w-full rounded-xl border bg-white px-3 py-2.5 text-[0.9375rem] text-ink focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Create or edit one vehicle. The API checks every field again and returns a message per field. Status can be set
 * only when the vehicle is created: later changes go through the status workflow on the vehicle page.
 */
export default function VehicleForm({
  mode,
  vehicleId,
  initial,
  expectedUpdatedAt,
}: {
  mode: "create" | "edit";
  vehicleId?: string;
  initial?: Partial<VehicleFormValues>;
  expectedUpdatedAt?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<VehicleFormValues>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field: FieldName) {
    return (event: { target: { value: string } }) => setValues((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setServerError("");

    // Status is sent only when creating. Editing never changes it, because that goes through the status workflow.
    const { status, ...details } = values;
    const payload: Record<string, unknown> = {
      ...details,
      manufacturingYear: values.manufacturingYear ? Number(values.manufacturingYear) : null,
    };
    if (mode === "create") {
      payload.status = status;
    } else {
      payload.expectedUpdatedAt = expectedUpdatedAt ?? null;
    }

    try {
      const response = await fetch(mode === "create" ? "/api/admin/vehicles" : `/api/admin/vehicles/${vehicleId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Partial<Record<FieldName, string>>;
        vehicle?: { id: string };
      };
      if (!response.ok) {
        setErrors(data.fields ?? {});
        setServerError(data.error ?? "The vehicle could not be saved. Try again.");
        return;
      }
      const id = mode === "create" ? data.vehicle?.id : vehicleId;
      router.push(`/portal/admin/vehicles/${id}`);
      router.refresh();
    } catch {
      setServerError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field id="registrationNumber" label="Registration number *" error={errors.registrationNumber}>
        <input
          id="registrationNumber"
          value={values.registrationNumber}
          onChange={update("registrationNumber")}
          placeholder="WP CAB-1234"
          aria-invalid={Boolean(errors.registrationNumber)}
          className={`${inputClass} ${errors.registrationNumber ? "border-red-400" : "border-line"}`}
        />
      </Field>

      <Field id="vehicleType" label="Vehicle type *" error={errors.vehicleType}>
        <select
          id="vehicleType"
          value={values.vehicleType}
          onChange={update("vehicleType")}
          className={`${inputClass} border-line`}
        >
          {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="make" label="Make" error={errors.make}>
        <input id="make" value={values.make} onChange={update("make")} className={`${inputClass} border-line`} />
      </Field>

      <Field id="model" label="Model" error={errors.model}>
        <input id="model" value={values.model} onChange={update("model")} className={`${inputClass} border-line`} />
      </Field>

      <Field id="manufacturingYear" label="Manufacturing year" error={errors.manufacturingYear}>
        <input
          id="manufacturingYear"
          inputMode="numeric"
          value={values.manufacturingYear}
          onChange={update("manufacturingYear")}
          className={`${inputClass} border-line`}
        />
      </Field>

      <Field id="colour" label="Colour" error={errors.colour}>
        <input id="colour" value={values.colour} onChange={update("colour")} className={`${inputClass} border-line`} />
      </Field>

      <Field id="transmissionType" label="Transmission *" error={errors.transmissionType}>
        <select
          id="transmissionType"
          value={values.transmissionType}
          onChange={update("transmissionType")}
          className={`${inputClass} border-line`}
        >
          {Object.entries(TRANSMISSION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {mode === "create" && (
        <Field id="status" label="Starting status *" error={errors.status}>
          <select id="status" value={values.status} onChange={update("status")} className={`${inputClass} border-line`}>
            {Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="sm:col-span-2">
        <Field id="description" label="Notes" error={errors.description}>
          <textarea
            id="description"
            rows={3}
            value={values.description}
            onChange={update("description")}
            className={`${inputClass} border-line`}
          />
        </Field>
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.875rem] font-medium text-red-700 sm:col-span-2">
          {serverError}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : mode === "create" ? "Add vehicle" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

/** Used by the detail page's history list, so the labels match the form. */
export function auditLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
