type Tone = "neutral" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-page text-muted ring-line",
  success: "bg-success-soft text-success ring-success/30",
  warning: "bg-gold-soft text-gold-ink ring-gold/60",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

/** Maps a stored status to a tone. The visible text comes from the caller, so labels stay in one place. */
export function toneFor(status: string): Tone {
  if (["APPROVED", "COMPLETED", "PRESENT", "PASS", "ACTIVE"].includes(status)) return "success";
  if (["PENDING", "SCHEDULED", "LATE", "RESCHEDULED"].includes(status)) return "warning";
  if (["REJECTED", "CANCELLED", "ABSENT", "FAIL", "INACTIVE"].includes(status)) return "danger";
  return "neutral";
}

export default function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1 ${tones[toneFor(status)]}`}>
      {label}
    </span>
  );
}
