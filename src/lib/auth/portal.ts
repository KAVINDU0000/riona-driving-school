/**
 * Client-safe portal routing. Nothing here imports server modules, so client components can use it.
 * Redirects only ever go to these fixed paths, chosen from the role the server returned. No URL from
 * the query string or the request is followed, which rules out open redirects.
 */

export type PortalRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export const PORTAL_PATHS: Record<PortalRole, string> = {
  STUDENT: "/portal/student",
  INSTRUCTOR: "/portal/instructor",
  ADMIN: "/portal/admin",
};

export const LOGIN_ROLE_PARAM: Record<PortalRole, string> = {
  STUDENT: "student",
  INSTRUCTOR: "instructor",
  ADMIN: "admin",
};

export function isPortalRole(value: unknown): value is PortalRole {
  return value === "STUDENT" || value === "INSTRUCTOR" || value === "ADMIN";
}

/** Returns the portal path for a role, or null when the role is not recognised. */
export function portalPathForRole(role: unknown): string | null {
  return isPortalRole(role) ? PORTAL_PATHS[role] : null;
}

/** The login page for a role. Pass "expired" when a session cookie exists but is no longer valid. */
export function loginPathFor(role: PortalRole, reason?: "expired"): string {
  const query = `role=${LOGIN_ROLE_PARAM[role]}${reason ? `&reason=${reason}` : ""}`;
  return `/login?${query}`;
}

/**
 * The message to show after a failed sign-in request. Every credential failure uses the same wording,
 * so the message never says whether an account exists.
 */
export function loginErrorMessage(status: number, retryAfterSeconds?: number): string {
  if (status === 0) return "We could not reach the sign-in service. Check your connection and try again.";
  if (status === 400) return "Enter your ID and password.";
  if (status === 401) return "Invalid ID or password.";
  if (status === 403) return "This request could not be verified. Refresh the page and try again.";
  if (status === 429) {
    const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 900) / 60));
    return `Too many sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return "Something went wrong. Please try again.";
}
