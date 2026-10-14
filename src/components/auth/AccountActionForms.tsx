"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";

const inputClass =
  "h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[0.9375rem] text-ink placeholder:text-muted/70 transition-colors focus:border-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:opacity-60";

const buttonClass =
  "mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-[0.9375rem] font-semibold text-ink shadow-[0_10px_24px_-12px_rgba(232,164,0,0.9)] transition-colors hover:bg-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark disabled:cursor-not-allowed disabled:opacity-70";

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Reads the {error} or {message} field from a JSON response, if any. Only shown for 400 and 429 responses. */
async function readMessage(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: unknown; message?: unknown };
    const text = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : null;
    return text;
  } catch {
    return null;
  }
}

function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const classes =
    tone === "error" ? "bg-red-50 text-red-700" : "bg-gold-soft text-gold-ink";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[0.8125rem] font-medium ${classes}`}>
      {children}
    </p>
  );
}

/** Removes the token from the address bar so it does not stay in history or get shared by copy-paste. */
function clearTokenFromUrl(path: string) {
  try {
    window.history.replaceState(null, "", path);
  } catch {
    // Not critical. The page still works without it.
  }
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (!email.trim()) {
      setError("Enter the email address on your account.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (response.status === 429) {
        setError((await readMessage(response)) ?? "Too many requests. Try again later.");
        return;
      }
      if (!response.ok) {
        setError(GENERIC_ERROR);
        return;
      }
      // The server gives the same reply whether or not the account exists. Show that reply unchanged.
      setSentMessage(
        (await readMessage(response)) ?? "If an account exists for that email, reset instructions will be sent.",
      );
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (sentMessage) {
    return (
      <div className="flex flex-col gap-5">
        <Notice tone="success">{sentMessage}</Notice>
        <p className="text-center text-[0.8125rem] text-muted">
          The link expires after 30 minutes. Check your spam folder if it does not arrive.
        </p>
        <Link href="/login" className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-5" aria-busy={pending}>
      <div className="flex flex-col gap-2">
        <label htmlFor="reset-email" className="text-[0.8125rem] font-semibold text-ink">
          Email address
        </label>
        <div className="relative">
          <Icon name="mail" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id="reset-email"
            name="email"
            type="email"
            placeholder="Enter your account email"
            value={email}
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            className={`${inputClass} border-line`}
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Sending…" : "Send reset link"}
      </button>

      {error && <Notice tone="error">{error}</Notice>}

      <Link href="/login" className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [repeated, setRepeated] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    clearTokenFromUrl("/reset-password");
  }, []);

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <Notice tone="error">This reset link is invalid or has expired.</Notice>
        <Link href="/forgot-password" className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <Notice tone="success">Your password has been changed. Sign in with your new password.</Notice>
        <Link href="/login" className={buttonClass.replace("mt-1 ", "")}>
          Go to sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (password.length < 8 || password.length > 128) {
      setError("Use between 8 and 128 characters for your new password.");
      return;
    }
    if (password !== repeated) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ token, password }),
      });
      if (response.ok) {
        setDone(true);
        return;
      }
      // 400 means the token is invalid or expired, or the password is too weak. Those messages are safe to show.
      if (response.status === 400 || response.status === 429) {
        setError((await readMessage(response)) ?? GENERIC_ERROR);
      } else {
        setError(GENERIC_ERROR);
      }
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="flex flex-col gap-5" aria-busy={pending}>
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className="text-[0.8125rem] font-semibold text-ink">
          New password
        </label>
        <div className="relative">
          <Icon name="lock" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            disabled={pending}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} border-line`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="repeat-password" className="text-[0.8125rem] font-semibold text-ink">
          Repeat new password
        </label>
        <div className="relative">
          <Icon name="lock" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id="repeat-password"
            name="repeatPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Type it again"
            value={repeated}
            disabled={pending}
            onChange={(event) => setRepeated(event.target.value)}
            className={`${inputClass} border-line`}
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save new password"}
      </button>

      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}

/** Confirms a new email address once, when the page opens. The POST runs once even in development's double-mount. */
export function ConfirmEmailPanel({ token }: { token: string | null }) {
  const started = useRef(false);
  const [state, setState] = useState<{ status: "pending" } | { status: "done"; message: string } | { status: "error"; message: string }>(
    token ? { status: "pending" } : { status: "error", message: "This verification link is invalid or has expired." },
  );

  useEffect(() => {
    clearTokenFromUrl("/confirm-email");
    if (!token || started.current) return;
    started.current = true;

    fetch("/api/account/email/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (response.ok) {
          setState({ status: "done", message: (await readMessage(response)) ?? "Your email address has been updated." });
          return;
        }
        if (response.status === 400 || response.status === 409) {
          setState({ status: "error", message: (await readMessage(response)) ?? GENERIC_ERROR });
          return;
        }
        setState({ status: "error", message: GENERIC_ERROR });
      })
      .catch(() => {
        setState({ status: "error", message: "We could not reach the server. Open the link again to retry." });
      });
  }, [token]);

  if (state.status === "pending") {
    return <p className="text-center text-[0.9375rem] text-muted">Confirming your new email address…</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      <Notice tone={state.status === "done" ? "success" : "error"}>{state.message}</Notice>
      <Link href="/login" className="text-center text-[0.8125rem] font-semibold text-gold-ink hover:text-ink">
        Go to sign in
      </Link>
    </div>
  );
}
