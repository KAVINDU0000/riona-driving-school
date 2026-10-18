"use client";

import { useState, type FormEvent } from "react";
import { publicContact } from "@/data/public";

type Option = { key: string; label: string };

type Status = "idle" | "sending" | "sent" | "failed";

const fieldClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-colors focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

const labelClass = "text-[0.8125rem] font-semibold text-ink";

/** Builds a WhatsApp link with the enquiry filled in. It is the fallback when the server cannot send the message. */
function whatsAppHref(values: { name: string; phone: string; email: string; vehicleLabel: string; message: string }) {
  const text = [
    "Hello Riyona Driving School, I would like to ask about lessons.",
    `Name: ${values.name}`,
    `Phone / WhatsApp: ${values.phone}`,
    values.email ? `Email: ${values.email}` : null,
    `Vehicle category: ${values.vehicleLabel}`,
    values.message ? `Message: ${values.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `${publicContact.whatsapp}?text=${encodeURIComponent(text)}`;
}

/**
 * Contact form. Submitting posts the enquiry to /api/contact, which sends it to the school's WhatsApp staff through
 * the WhatsApp Cloud API. If that cannot send it, the form offers a WhatsApp link with the same details filled in.
 */
export default function ContactForm({ vehicles }: { vehicles: Option[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const vehicleLabel = vehicles.find((item) => item.key === vehicle)?.label ?? "Not chosen";
  const fallbackHref = whatsAppHref({
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    vehicleLabel,
    message: message.trim(),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Please enter your name and phone or WhatsApp number.");
      return;
    }
    setError("");
    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          vehicle,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        setName("");
        setPhone("");
        setEmail("");
        setVehicle("");
        setMessage("");
        setStatus("sent");
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "We could not send your message. Please try again or message us on WhatsApp.");
      setStatus("failed");
    } catch {
      setError("We could not reach the server. Please try again or message us on WhatsApp.");
      setStatus("failed");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>Full name *</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={100}
            placeholder="e.g. Kasun Jayawardena"
            className={fieldClass}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Phone / WhatsApp *</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            maxLength={20}
            placeholder="e.g. 077 123 4567"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className={labelClass}>Email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={120}
            placeholder="you@example.com"
            className={fieldClass}
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Vehicle category</span>
          <select value={vehicle} onChange={(event) => setVehicle(event.target.value)} className={fieldClass}>
            <option value="">Not chosen</option>
            {vehicles.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className={labelClass}>Message or timing preferences (optional)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell us which days or times suit you best."
          className={`${fieldClass} resize-y`}
        />
      </label>

      {error && (
        <p role="alert" className="text-[0.875rem] text-red-600">
          {error}
        </p>
      )}

      {status === "sent" && (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-[0.9375rem] font-semibold text-success">
          Thank you. Your message has been sent to our team on WhatsApp.
        </p>
      )}

      {status === "failed" && (
        <a
          href={fallbackHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center rounded-xl bg-white px-5 py-3 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
        >
          Open this message in WhatsApp
        </a>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : "Send message"}
        </button>
        <p className="text-[0.8125rem] text-muted">Your message goes to the school&apos;s WhatsApp. It is not kept on this website.</p>
      </div>
    </form>
  );
}
