"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png";

/**
 * Uploads a payment slip to one pending payment. The browser's checks are only a convenience: the server
 * checks the file's content, size and ownership again before storing anything.
 */
export default function PaymentSlipForm({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setDone("");

    const file = input.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF, JPEG or PNG file.");
      return;
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      setError("The file must be between 1 byte and 5 MB.");
      return;
    }

    setPending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/student/payments/${encodeURIComponent(paymentId)}/slips`, {
        method: "POST",
        body: form,
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "The slip could not be uploaded. Try again.");
        return;
      }
      setDone("Slip uploaded. The school will review it.");
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={upload} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-busy={pending}>
      <label htmlFor={`slip-${paymentId}`} className="sr-only">
        Payment slip file
      </label>
      <input
        id={`slip-${paymentId}`}
        ref={input}
        type="file"
        accept={ACCEPT}
        disabled={pending}
        className="w-full text-[0.875rem] text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-page file:px-4 file:py-2 file:font-semibold file:text-ink hover:file:ring-1 hover:file:ring-line"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-xl bg-gold px-4 py-2.5 text-[0.875rem] font-semibold text-ink hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload slip"}
      </button>
      {error && (
        <p role="alert" className="text-[0.8125rem] text-red-700 sm:basis-full">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-[0.8125rem] font-medium text-success sm:basis-full">
          {done}
        </p>
      )}
    </form>
  );
}
