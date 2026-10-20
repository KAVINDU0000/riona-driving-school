/**
 * Resolves the client address used as a rate-limit key. Pure: no request object, no environment reads in the resolver,
 * so the rules can be tested directly.
 *
 * X-Forwarded-For is client-controlled. Each proxy that is in front of the app APPENDS the address it received, so the
 * entry written by the nearest trusted proxy is the last one, and the real client is the entry before the trusted
 * entries. Trust is therefore given only to the number of proxies the operator configures (TRUSTED_PROXY_HOPS). With the
 * default of 0, no forwarded header is trusted, so every request shares one key. That is deliberately strict: it stops
 * a client from choosing its own key, at the cost of sharing IP limits when no proxy is configured.
 *
 * Node cannot report the socket address to a route handler, so there is no direct-peer fallback. A deployment behind a
 * proxy must set TRUSTED_PROXY_HOPS to the number of proxies that append to X-Forwarded-For.
 */

/** The shared key used when the client address cannot be trusted. */
export const UNTRUSTED_CLIENT_KEY = "untrusted";

const MAX_TRUSTED_HOPS = 10;
const MAX_ADDRESS_LENGTH = 64;

/** Reads TRUSTED_PROXY_HOPS. Unset means 0. Anything that is not a whole number from 0 to 10 is a configuration error. */
export function parseTrustedProxyHops(raw: string | undefined): number {
  const value = raw?.trim();
  if (!value) return 0;
  const hops = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(hops) || hops > MAX_TRUSTED_HOPS) {
    throw new Error(`TRUSTED_PROXY_HOPS must be a whole number from 0 to ${MAX_TRUSTED_HOPS}.`);
  }
  return hops;
}

/** The client address for a request, given its X-Forwarded-For value and the number of trusted proxies. */
export function resolveClientIp(forwardedFor: string | null, trustedHops: number): string {
  if (trustedHops === 0 || !forwardedFor) return UNTRUSTED_CLIENT_KEY;

  const entries = forwardedFor.split(",").map((entry) => entry.trim());
  // The last `trustedHops` entries were appended by our proxies. The first of those is the address the client-facing
  // proxy received, which is the client. Anything before it was supplied by the client and is ignored.
  const index = entries.length - trustedHops;
  if (index < 0) return UNTRUSTED_CLIENT_KEY;

  const address = entries[index];
  if (!address || address.length > MAX_ADDRESS_LENGTH) return UNTRUSTED_CLIENT_KEY;
  return address;
}
