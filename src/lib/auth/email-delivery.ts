/**
 * Delivery of password-reset and email-change links.
 *
 * No email provider is configured in this project yet, so this always reports "not delivered".
 * Callers then discard the token, so no link is ever issued that nobody received.
 * Connect a provider here. Never log the token or the full link.
 */
// The parameters are unused until a provider is connected.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deliverAuthEmail(kind: "password-reset" | "email-change", to: string, token: string): Promise<boolean> {
  return false;
}
