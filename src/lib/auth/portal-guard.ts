import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, type AuthUser } from "@/lib/auth/authorize";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { loginPathFor, portalPathForRole, type PortalRole } from "@/lib/auth/portal";

/**
 * Server-side guard for portal pages. It checks the session and the role on every render. A successful
 * login response is never treated as proof of access.
 *
 * - No valid session: redirect to that role's login page. If a session cookie was sent but is no
 *   longer valid, the login page says the session ended.
 * - Valid session for a different role: redirect to that user's own portal.
 */
export async function requirePortalUser(role: PortalRole): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    const hadCookie = (await cookies()).has(SESSION_COOKIE_NAME);
    redirect(loginPathFor(role, hadCookie ? "expired" : undefined));
  }

  if (user.role !== role) {
    redirect(portalPathForRole(user.role) ?? loginPathFor(role));
  }

  return user;
}
