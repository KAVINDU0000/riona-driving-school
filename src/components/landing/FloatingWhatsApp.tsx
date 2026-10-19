"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icon";
import { site } from "@/data/landing";

const MAX_LENGTH = 500;

/*
 * The visitor types a message here, then taps Send. WhatsApp opens to the school's number with the message already in
 * the box, and the visitor taps send there. The school sees it in WhatsApp and replies there. No WhatsApp API is used.
 */
export default function FloatingWhatsApp() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const panelId = useId();
  const textId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text) {
      setError("Please type your message first.");
      return;
    }
    setError("");
    window.open(`${site.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setMessage("");
    setOpen(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Message Riyona Driving School on WhatsApp"
          className="w-[min(320px,calc(100vw-48px))] overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-line"
        >
          <div className="flex items-center gap-3 bg-success px-4 py-3.5 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
              <Icon name="chat" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-bold leading-tight">Riyona Driving School</p>
              <p className="text-[0.75rem] text-white/85">Type your message and we will reply on WhatsApp</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
            <label htmlFor={textId} className="text-[0.8125rem] font-semibold text-ink">
              Your message
            </label>
            <textarea
              id={textId}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                if (error) setError("");
              }}
              maxLength={MAX_LENGTH}
              rows={4}
              placeholder="Type your question here..."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${textId}-error` : undefined}
              className="w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-[0.875rem] leading-[1.55] text-ink placeholder:text-muted focus:border-gold-dark focus:outline-none focus:ring-2 focus:ring-gold-soft"
            />
            {error && (
              <p id={`${textId}-error`} className="text-[0.8125rem] font-semibold text-red-600">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.75rem] text-muted">
                {message.length}/{MAX_LENGTH}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-success/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Send on WhatsApp
                <Icon name="arrow-up-right" className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close message box" : "Chat with Riyona on WhatsApp"}
        className="grid h-12 w-12 place-items-center rounded-full bg-success text-white shadow-float transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
      >
        <Icon name={open ? "x-circle" : "chat"} className="h-5 w-5" />
      </button>
    </div>
  );
}
