"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { loginErrorMessage, portalPathForRole } from "@/lib/auth/portal";

interface LoginFormProps {
  endpoint: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierType: "text" | "email";
  identifierIcon: string;
  submitLabel: string;
  footnote?: ReactNode;
}

export default function LoginForm({
  endpoint,
  identifierLabel,
  identifierPlaceholder,
  identifierType,
  identifierIcon,
  submitLabel,
  footnote,
}: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  // Blocks a second submit while the first is in flight, including the redirect after success.
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const nextErrors: typeof errors = {};
    if (!identifier.trim()) nextErrors.identifier = `Enter your ${identifierLabel.toLowerCase()}.`;
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    inFlight.current = true;
    setPending(true);

    let navigating = false;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      if (!response.ok) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "");
        setFormError(loginErrorMessage(response.status, Number.isFinite(retryAfter) ? retryAfter : undefined));
        // Clear the password after a rejected attempt. The identifier stays so the user can correct it.
        if (response.status === 401) setPassword("");
        return;
      }

      const data = (await response.json()) as { role?: unknown };
      // The destination is chosen from the role the server returned. No URL from the request is used.
      const destination = portalPathForRole(data.role);
      if (!destination) {
        setFormError(loginErrorMessage(500));
        return;
      }

      navigating = true;
      router.replace(destination);
      router.refresh();
    } catch {
      setFormError(loginErrorMessage(0));
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-colors focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-5" aria-busy={pending}>
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
            autoComplete="off"
            placeholder={identifierPlaceholder}
            value={identifier}
            disabled={pending}
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
            disabled={pending}
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
            disabled={pending}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[var(--color-gold-dark)]"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in…" : submitLabel}
        {!pending && <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />}
      </button>

      {formError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[0.8125rem] font-medium text-red-700">
          {formError}
        </p>
      )}

      {footnote && <div className="text-center text-[0.8125rem] text-muted">{footnote}</div>}
    </form>
  );
}
