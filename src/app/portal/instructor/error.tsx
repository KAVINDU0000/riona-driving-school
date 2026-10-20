"use client";

import ErrorState from "@/components/student/ErrorState";

/** Catches failures in any instructor page and offers a retry. The raw error is not shown. */
export default function InstructorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <ErrorState onRetry={reset} />
    </div>
  );
}
