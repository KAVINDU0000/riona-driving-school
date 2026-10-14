"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";

interface LoginFormProps {
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierType: "text" | "email";
  identifierIcon: string;
  submitLabel: string;
  footnote?: ReactNode;
}

export default function LoginForm({
  identifierLabel,
  identifierPlaceholder,
  identifierType,
  identifierIcon,
  submitLabel,
  footnote,
}: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (!identifier.trim()) nextErrors.identifier = `Enter your ${identifierLabel.toLowerCase()}.`;
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    setNotice(Object.keys(nextErrors).length ? "" : "Sign-in is not connected to a server yet.");
  }

  const inputClass =
    "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-colors focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="identifier" className="text-[0.8125rem] font-semibold text-ink">
          {identifierLabel}
        </label>
        <div className="relative">
          <Icon name={identifierIcon} className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id="identifier"
            name="identifier"
            type={identifierType}
            autoComplete="username"
            placeholder={identifierPlaceholder}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
            className={`${inputClass} ${errors.identifier ? "border-red-400" : "border-line"}`}
          />
        </div>
        {errors.identifier && (
          <p id="identifier-error" className="text-[0.8125rem] text-red-600">
            {errors.identifier}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[0.8125rem] font-semibold text-ink">
          Password
        </label>
        <div className="relative">
          <Icon name="lock" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`${inputClass} ${errors.password ? "border-red-400" : "border-line"}`}
          />
        </div>
        {errors.password && (
          <p id="password-error" className="text-[0.8125rem] text-red-600">
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium text-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[var(--color-gold-dark)]"
          />
          Remember me
        </label>
        <a href="#" className="text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
      >
        {submitLabel}
        <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
      </button>

      {notice && (
        <p role="status" className="rounded-xl bg-gold-soft px-4 py-3 text-[0.8125rem] font-medium text-gold-ink">
          {notice}
        </p>
      )}

      {footnote && <div className="text-center text-[0.8125rem] text-muted">{footnote}</div>}
    </form>
  );
}
