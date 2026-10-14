"use client";

import ErrorState from "@/components/student/ErrorState";

/** Catches failures in any student page and offers a retry. The raw error is not shown to the student. */
export default function StudentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
