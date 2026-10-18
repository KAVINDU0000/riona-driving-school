"use client";

import { useState, type FormEvent } from "react";
import { publicContact } from "@/data/public";

type Option = { key: string; label: string };

const fieldClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-colors focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

const labelClass = "text-[0.8125rem] font-semibold text-ink";

/**
 * Contact form. The project has no place to store or deliver messages, so nothing is posted to this site. Submitting
 * opens WhatsApp with the details filled in, and the person sends it from their own account.
 */
export default function ContactForm({ vehicles }: { vehicles: Option[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Please enter your name and phone or WhatsApp number.");
      return;
    }
    setError("");

    const vehicleLabel = vehicles.find((item) => item.key === vehicle)?.label ?? "Not chosen";
    const text = [
      "Hello Riyona Driving School, I would like to ask about lessons.",
      `Name: ${name.trim()}`,
      `Phone / WhatsApp: ${phone.trim()}`,
      email.trim() ? `Email: ${email.trim()}` : null,
      `Vehicle category: ${vehicleLabel}`,
      message.trim() ? `Message: ${message.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`${publicContact.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
            maxLength={30}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
        >
          Send on WhatsApp
        </button>
        <p className="text-[0.8125rem] text-muted">
          Your message opens in WhatsApp. This website does not store it.
        </p>
      </div>
    </form>
  );
}
