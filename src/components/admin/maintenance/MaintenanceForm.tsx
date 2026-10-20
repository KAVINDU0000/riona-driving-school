"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BUTTON_INK, FIELD, LABEL, SELECT_FIELD } from "@/components/admin/admin-ui";
import { sendJson } from "@/components/admin/maintenance/api";

export type MaintenanceField = {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "select" | "textarea" | "checkbox";
  options?: readonly (readonly [string, string])[];
  required?: boolean;
  help?: string;
};

type Raw = Record<string, FormDataEntryValue>;

/** The default conversion: blank optional text becomes null, numbers become numbers, checkboxes become booleans. */
function defaultPayload(raw: Raw, fields: MaintenanceField[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = raw[field.name];
    if (field.type === "checkbox") {
      payload[field.name] = value === "on";
      continue;
    }
    const text = typeof value === "string" ? value.trim() : "";
    if (text === "") {
      payload[field.name] = field.required ? "" : null;
    } else if (field.type === "number") {
      payload[field.name] = Number(text);
    } else {
      payload[field.name] = text;
    }
  }
  return payload;
}

/**
 * One maintenance record form. The server validates everything and returns the message to show; the form only converts
 * input types. Each submit sends one request and refreshes the page on success.
 */
export default function MaintenanceForm({
  title,
  description,
  endpoint,
  method = "POST",
  fields,
  submitLabel,
  transform,
  note,
}: {
  title: string;
  description?: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  fields: MaintenanceField[];
  submitLabel: string;
  transform?: (raw: Raw, base: Record<string, unknown>) => Record<string, unknown>;
  note?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const formId = `form-${endpoint.replace(/[^a-z0-9]/gi, "-")}-${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form)) as Raw;
    const base = defaultPayload(raw, fields);
    const payload = transform ? transform(raw, base) : base;
    setBusy(true);
    setError("");
    setMessage("");
    const result = await sendJson(endpoint, method, payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage("Saved.");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${formId}-title`} className="rounded-2xl border border-line bg-white p-5">
      <h3 id={`${formId}-title`} className="text-[1rem] font-bold text-ink">
        {title}
      </h3>
      {description ? <p className="mt-1 text-[0.875rem] text-muted">{description}</p> : null}
      {note ? <p className="mt-2 rounded-xl bg-page p-3 text-[0.8125rem] text-ink">{note}</p> : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `${formId}-${field.name}`;
          if (field.type === "checkbox") {
            return (
              <div key={field.name} className="flex items-start gap-2 sm:col-span-2">
                <input id={id} name={field.name} type="checkbox" className="mt-1 h-4 w-4 accent-gold-dark" />
                <label htmlFor={id} className="text-[0.875rem] text-ink">
                  {field.label}
                  {field.help ? <span className="block text-[0.8125rem] text-muted">{field.help}</span> : null}
                </label>
              </div>
            );
          }
          const wide = field.type === "textarea" ? "sm:col-span-2" : "";
          return (
            <div key={field.name} className={`flex flex-col gap-2 ${wide}`}>
              <label htmlFor={id} className={LABEL}>
                {field.label}
                {field.required ? <span aria-hidden="true" className="text-red-600"> *</span> : null}
              </label>
              {field.type === "select" ? (
                <select id={id} name={field.name} className={SELECT_FIELD} defaultValue="">
                  <option value="">{field.required ? "Choose…" : "None"}</option>
                  {(field.options ?? []).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea id={id} name={field.name} rows={3} className={FIELD} />
              ) : (
                <input id={id} name={field.name} type={field.type} step={field.type === "number" ? "any" : undefined} className={FIELD} />
              )}
              {field.help ? <span className="text-[0.8125rem] text-muted">{field.help}</span> : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-[0.875rem] text-red-700">
          {error}
        </p>
      ) : null}
      {message && !error ? (
        <p role="status" className="mt-4 text-[0.875rem] font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={busy} className={BUTTON_INK}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
