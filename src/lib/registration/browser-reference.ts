/**
 * The application reference is kept in this browser tab's session, so the payment step can use it without showing
 * it. The applicant sees the reference only after the payment slip is uploaded. Closing the tab clears it.
 */
const KEY = "riona.applicationReference";

export function saveApplicationReference(reference: string) {
  try {
    window.sessionStorage.setItem(KEY, reference);
  } catch {
    // Storage can be blocked. The payment page then explains what to do, and nothing breaks.
  }
}

export function readApplicationReference(): string {
  try {
    return window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
