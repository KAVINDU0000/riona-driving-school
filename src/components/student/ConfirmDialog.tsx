"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Accessible confirmation built on the native dialog element. Escape is blocked while the action is busy. */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="w-[min(92vw,460px)] rounded-2xl bg-white p-6 text-ink shadow-[0_24px_60px_-20px_rgb(16_27_48/0.4)] backdrop:bg-ink/40"
    >
      <h2 id="confirm-dialog-title" className="text-[1.125rem] font-bold tracking-[-0.01em]">
        {title}
      </h2>
      <div className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl px-4 py-2.5 text-[0.9375rem] font-semibold text-ink ring-1 ring-line hover:ring-ink/30 disabled:opacity-60"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-xl bg-gold px-4 py-2.5 text-[0.9375rem] font-semibold text-ink hover:bg-gold-dark disabled:opacity-70"
        >
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
