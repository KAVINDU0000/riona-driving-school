# Riyona Driving School

The official website and management system for Riyona Driving School, Werahera, Sri Lanka.

The project has two parts:

- **Public website:** the school's home page, packages and vehicles, road signs and road rules in English, සිංහල and தமிழ், practice papers, contact details, and online sign-up with bank-slip payment.
- **Portals:** separate areas for students, instructors and administrators. Students book fixed practical sessions, track progress and pay. Instructors manage their availability and lessons. Administrators handle registrations, payments, lessons, vehicles, packages and session times.

## Features

- Fixed practical session times (08:00, 10:00, 12:00, 14:00) that admins open and close, and instructors take and release
- Shared sessions, where several students learn in the same vehicle with one instructor, with a seat limit for each vehicle type
- Package and training requirement tracking per student
- Bank-slip payment submission and review
- Vehicle maintenance records, reminders and fault reporting
- Lesson attendance, outcomes and feedback
- Multilingual road signs and road rules (English, Sinhala and Tamil)
- Sign-in with role-based access, password reset and email verification

## Tech stack

- [Next.js](https://nextjs.org/) 16 with the App Router, React 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4
- [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io/) 7 as the ORM
- [Vitest](https://vitest.dev/) for unit and integration tests
- [pnpm](https://pnpm.io/) for package management
- Docker Compose for a local database

## Getting started

### Prerequisites

- A current Node.js LTS release
- pnpm
- Docker (for the local PostgreSQL database)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start a local PostgreSQL database:

   ```bash
   docker compose up -d
   ```

3. Copy `.env.example` to `.env.local` and fill in the values. See [Environment variables](#environment-variables).

4. Apply the database migrations:

   ```bash
   pnpm exec prisma migrate deploy
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Create the first administrator

```bash
pnpm admin:bootstrap
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the development server |
| `pnpm build` | Generates the Prisma client and builds for production |
| `pnpm start` | Runs the production build |
| `pnpm lint` | Runs ESLint |
| `pnpm test` | Runs the test suite |
| `pnpm test:e2e` | Runs the browser tests with Playwright |
| `pnpm db:check` | Checks which database the current settings point to |
| `pnpm admin:bootstrap` | Creates the first administrator account |
| `pnpm admin:reset-password` | Resets an administrator's password |

## Environment variables

The values are kept in `.env.local` for development. Never commit real values.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by the application |
| `DIRECT_URL` | Direct PostgreSQL connection used for migrations |
| `APP_ORIGIN` | The public address of the site, for example `https://riyonadrivingschool.com.lk`. The request origin check uses it. No trailing slash. |
| `TRUSTED_PROXY_HOPS` | Number of proxies in front of the app, so the real client address is used for rate limits |
| `RESEND_API_KEY` | Email delivery key for account emails |
| `AUTH_EMAIL_FROM` | Sender address for account emails |
| `WHATSAPP_*` | Optional WhatsApp Cloud API settings for notifications |
| `PAYMENT_SLIP_STORAGE_DIR` | Folder where uploaded bank slips are stored |
| `MAINTENANCE_DOCUMENT_STORAGE_DIR` | Folder where vehicle documents are stored |

## Testing

```bash
pnpm test
```

The database tests truncate tables. They only run against a disposable database, and `tests/setup.ts` refuses to run against any other target. Set `TEST_TARGET`, `TEST_CONFIRM_TRUNCATE` and `TEST_DATABASE_URL` to point at the disposable database before running them.

## Deployment

The site is deployed from the `main` branch. Before deploying a change that includes new migrations:

1. Apply the migrations to the production database with `prisma migrate deploy`.
2. Merge the change into `main`.
3. Check that the new version loads and that sign-in works.

Production uses a Neon PostgreSQL database. Keep the production connection string out of the repository.

## Project structure

```text
src/
├── app/            Pages and API routes (public site, portals and API)
├── components/     Shared UI, organised by area (admin, instructor, student, public)
├── data/           Packages, road signs and translated text
├── lib/            Business rules, database access and authentication
└── generated/      Prisma client (generated)

prisma/
├── migrations/     Database migrations
└── schema.prisma   Database schema

scripts/            Setup and maintenance scripts
tests/              Unit and integration tests
```

## Security

- Sign-in uses HTTP-only session cookies, with SameSite protection.
- Requests that change data check the request origin against `APP_ORIGIN`.
- Passwords are hashed, and sign-in attempts are rate limited.
- Portal pages are blocked from search engines through `robots.txt`.
