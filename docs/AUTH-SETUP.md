# Authentication setup

How to create accounts, configure email, and run the sign-in flows.

## Account types

| Role | How the account is created | How the user signs in |
|---|---|---|
| Admin | One-time command: `pnpm admin:bootstrap` | `/login?role=admin` with admin ID and password |
| Instructor | Admin calls `POST /api/admin/instructors`, which sends an invitation | `/login?role=instructor` with instructor ID and password |
| Student | An admin approves the application at `/portal/admin`, which creates the account with the password chosen at signup | `/login?role=student` with student ID and password |

There is no public admin or instructor sign-up.

## Creating the first admin

Run this from an interactive terminal, against the database you intend to use:

```bash
pnpm admin:bootstrap
```

It shows the target database (name, host and port only) and asks you to type `<database>@<host>` to confirm it. Then it asks for an admin ID (for example `ADMIN-001`) and a password entered twice without echo. No email address is asked for or stored: admins sign in with their ID only, and an email is never accepted as an admin login. The password is never read from arguments, environment variables or piped input.

- The command refuses to run if any admin already exists. It is not run by builds, migrations or startup.
- It uses `DATABASE_URL` from `.env.local` (or from the shell, which takes precedence). Check that value before running the command. A `.env.local` that points at a shared or hosted database will create the admin there.
- To verify: sign in at `/login?role=admin` with the admin ID and password you entered.

## Recovering an admin password

An admin without an email cannot use the emailed password reset. If an admin cannot sign in, run this from an interactive terminal:

```bash
pnpm admin:reset-password
```

It confirms the target database the same way, then asks for the admin ID and a new password entered twice without echo. Only accounts with the ADMIN role can be reset. The admin is signed out everywhere and unused reset links are voided; the account's ID, email, role and status do not change, so an inactive admin stays inactive. Anyone who can run this command against the database can take over an admin account, so treat database access as admin access.

An admin may also add an email address later through the normal confirmed email change; the address is then used only for the emailed password reset, never for sign-in.

## Creating an instructor

An admin calls the endpoint with a session cookie from an admin sign-in:

```http
POST /api/admin/instructors
Content-Type: application/json

{
  "instructorId": "INS-002",
  "email": "instructor@example.lk",
  "fullName": "Nimal Perera",
  "phoneNumber": "0712345678",
  "hireDate": "2025-03-01"
}
```

Responses: `201` on success, `400` for invalid details, `401` without a session, `403` for a non-admin or a cross-site request, `409` for a duplicate email or ID, `503` when the invitation email cannot be sent.

On success the user and instructor profile are created in one transaction, and an invitation with a single-use setup link (valid 30 minutes) is emailed. The account starts with a random password nobody knows. The instructor chooses a password through the link. If the email cannot be sent, nothing is created, so the admin can retry.

There is no admin screen for this yet. It is only reachable through the API.

## Email delivery (Resend)

Email is sent for password resets, email-change confirmations and instructor invitations. Set these server-only variables:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key. Never commit it or expose it to client code |
| `AUTH_EMAIL_FROM` | Sender on a domain you have verified in Resend |
| `APP_ORIGIN` | Public origin for links, for example `https://www.example.lk`. Required in production |

Setup steps:

1. Verify the sending domain in the Resend dashboard and add its DNS records.
2. Create an API key with send permission.
3. Set the three variables in the hosting environment (not in source control).

Without them the app does not send email. Password reset requests still return the same generic response. Email-change and invitation requests fail safely (`503`) and create nothing. Delivery is confirmed only when Resend accepts the message. Tokens are never logged, and links are built only from `APP_ORIGIN`.

Tests use a mocked provider and need no key.

## Rate limiting

Login, password-reset and email-change endpoints are rate limited. The limiter is in memory (`src/lib/auth/rate-limit.ts`), so limits apply per process and reset on restart. This is fine for local development. A deployment with several instances needs a shared store, for example a database table or Redis, behind the same `consumeRateLimit` function.

## Sessions and cookies

The session token is random, stored only as a hash, and sent in the `riona_session` cookie (`HttpOnly`, `SameSite=Lax`, 7 days, `Secure` in production). Nothing is stored in local storage or session storage. Pages check the session and role on the server. Successful login does not grant access by itself.

## Known gaps

- Public student registration does not create accounts. The API for it does not exist yet. The sign-up form validates fields and then sends the user to a payment step that is not connected to a server.
- The "Remember me" checkbox on the login form has no effect. Sessions last 7 days either way.
- Email change has no account page yet. It is only reachable through `POST /api/account/email/request`.
- Portal pages (`/portal/student`, `/portal/instructor`, `/portal/admin`) are placeholders that confirm sign-in and role checks.
