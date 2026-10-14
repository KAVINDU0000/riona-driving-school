import { getAppOrigin } from "@/lib/auth/config";

/**
 * Delivery of password-reset, email-change and account-setup links through Resend.
 *
 * Returns true only when Resend accepted the message. It returns false when the provider is not
 * configured or the request fails. Callers then discard the token, so no link is ever issued that
 * nobody received, and no response claims that an email was sent when it was not.
 *
 * Required server-only environment variables:
 *   RESEND_API_KEY   API key from Resend. Never expose it to client code or commit it.
 *   AUTH_EMAIL_FROM  Sender address on a domain verified in Resend, e.g. "Riyona <no-reply@example.lk>".
 *   APP_ORIGIN       Public origin used to build links. Required in production.
 *
 * Raw tokens and full links are never logged. Only the HTTP status or the error name is logged.
 */

export type AuthEmailKind = "password-reset" | "email-change" | "account-setup";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

const EMAIL_CONTENT: Record<AuthEmailKind, { subject: string; path: string; text: string }> = {
  "password-reset": {
    subject: "Reset your Riyona Driving School password",
    path: "/reset-password",
    text: "We received a request to reset your password. Open the link below within 30 minutes to choose a new password.\n\nIf you did not ask for this, you can ignore this email. Your password will not change.",
  },
  "email-change": {
    subject: "Confirm your new email address",
    path: "/confirm-email",
    text: "Confirm this address for your Riyona Driving School account. The link expires in 60 minutes.\n\nIf you did not ask for this change, ignore this email. Your address will not change.",
  },
  "account-setup": {
    subject: "Set up your Riyona Driving School account",
    path: "/reset-password",
    text: "An administrator created an instructor account for you at Riyona Driving School. Open the link below within 30 minutes to choose your password.\n\nIf you were not expecting this, ignore this email.",
  },
};

/** Sends one auth email. Returns false when delivery is not configured or fails. */
export async function deliverAuthEmail(kind: AuthEmailKind, to: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const origin = getAppOrigin();
  if (!apiKey || !from || !origin) return false;

  const content = EMAIL_CONTENT[kind];
  const link = `${origin}${content.path}?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        text: `${content.text}\n\n${link}\n`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[auth] email provider rejected a ${kind} message (HTTP ${response.status})`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[auth] email provider request failed for ${kind}:`, error instanceof Error ? error.name : "UnknownError");
    return false;
  }
}
