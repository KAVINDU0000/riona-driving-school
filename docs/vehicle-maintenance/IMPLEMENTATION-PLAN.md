# Vehicle maintenance: implementation plan (after Phase C2)

Source of truth: `DESIGN.md`. The migration draft (`DRAFT-migration.sql`) and rollback draft (`DRAFT-rollback.sql`) are reviewed
against it. Nothing in this plan is applied to any database.

## Confirmed business decisions and provisional settings

| Decision | Status | Where it lives |
|---|---|---|
| A recorded VET FAIL is shown as **FAILED**, whatever the expiry or due dates say. The deciding date stays visible. | Confirmed by the school | `vetStatus` in `compliance-rules.ts` |
| Service due-soon thresholds: **14 days** and **500 km** | **PROVISIONAL, pending school confirmation.** Configurable defaults, not permanent rules. | `PROVISIONAL_SERVICE_DUE_SOON_DAYS`, `PROVISIONAL_SERVICE_DUE_SOON_KM` (`maintenance-rules.ts`); `DEFAULT_MAINTENANCE_SETTINGS` (`compliance-rules.ts`) |
| Safety-critical open faults give an **administrator warning only**. They never block vehicle booking. | Confirmed by the school | `openFaultWarnings`, `maintenanceWarnings` (`maintenance-rules.ts`) |
| A vehicle is offered for lessons only when its status is ACTIVE. INACTIVE and MAINTENANCE stay unavailable. | Existing rule, unchanged | `vehicleAvailability` (`maintenance-rules.ts`) |

Other settled rules (from earlier phases): reminder lead times default to 30, 14 and 7 days and are configurable; insurance and
VET warnings use the largest lead time; Revenue Licence renewal prerequisites warn and need a recorded confirmation; a corrective
service may link only to a fault of the same vehicle; money is LKR, exact to the cent.

Still open (see `DESIGN.md` section 15 and "Unresolved mismatches" below): the Revenue Licence renewal rule, whether a separate
odometer log is wanted (the design uses the latest service-record reading as the only source), and the document-kind to link rule.

## Status

| Phase | Scope | Status |
|---|---|---|
| A | Design, migration draft, rollback draft, compatibility review | Done. Drafts only. |
| B | Database-free domain rules and their tests | Done. The repository schema is still unchanged. |
| C1 | PostgreSQL 18 verification on a disposable container; draft fixes; application validation | Done. Verified on a disposable PostgreSQL 18 container only. Nothing applied to a shared database. |
| C2 | Prisma scratch validation and mapping; threshold, fault and FAILED decisions; plan | Done. Static only. |
| Step 1 | `clientIp()` fix: forwarded headers trusted only for `TRUSTED_PROXY_HOPS` proxies | Done. Database-free tests pass. |
| C3 | Repository schema and client; server functions; audit writes; route authorisation | Done. Schema in `prisma/schema.prisma`; 13 admin routes; the client is generated locally (git-ignored). The SQL draft is still not in `prisma/migrations`. |
| D | Admin maintenance page and record forms | Done (compiled and linted). Not exercised in a browser. |
| E | Scripted end-to-end run on a disposable PostgreSQL 18; rollback test | Done for the back end (42 checks, 70 constraint checks, rollback verified). Vitest database suites not run: see the report. |

Still open after this phase: the Vitest integration suite for maintenance (blocked by the test-target guard, which allows only the local PostgreSQL 17 target); a browser test of the maintenance page; a role-403 check of each route (only the 401 path was exercised); a concurrency test of the insurance overlap lock; the decision on whether a document's kind must match its record; a shared-database migration (not approved).

## Completed work

- **Drafts (reviewed):** `DRAFT-migration.sql` (12 tables, 11 enumerations, 5 functions, 14 triggers, 40 named CHECK constraints) and
  `DRAFT-rollback.sql` (drops exactly those objects). Both are in `docs/vehicle-maintenance/` only.
- **PostgreSQL 18 (disposable container, Phase C1):** repository history applied, migration draft applied, constraint and trigger
  suite run in a rolled-back transaction (70 PASS notices, no errors), corrected rollback run (28 objects removed, none added).
  Two draft defects were found and fixed (NULL-passing CHECK on the document deletion reason; rollback drop order). The container
  was stopped and removed.
- **Domain rules (database-free):** insurance, VET, Revenue Licence, service states (derived from the latest record), checklist,
  odometer, reminders (idempotent key, configurable lead days), repairs, fault warnings, documents and retention.
- **Application validation:** `src/lib/vehicles/record-validation.ts` mirrors the draft database limits (names, insurer and policy
  number lengths, premium and service totals in cents, date ordering, licences, service records, fault and decision text).
- **Tests (database-free):** `tests/vehicle-maintenance-rules.test.ts`, `tests/vehicle-maintenance-phase-b.test.ts`,
  `tests/vehicle-record-validation.test.ts`: 104 tests, passing.
- **Prisma scratch copy (C2):** validated, and its generated DDL matches the draft (see "Prisma integration").

## Prisma integration (C2)

Scratch files (outside the repository, in the session scratchpad):
- `phaseC2-maintenance-models.prisma`: the 12 models and 11 enumerations, written from `DRAFT-migration.sql`.
- `assemble-phaseC2-schema.mjs`: builds `phaseC2-schema.prisma` from a read-only copy of `prisma/schema.prisma`, adds the back
  relations on `Vehicle` and `User`, and appends the models. It does not write to the repository.
- `compare-phaseC2.mjs`: compares Prisma's generated DDL with the draft.

Commands and results (no database; dummy URLs set inline for `DIRECT_URL`, which `prisma7.config.ts` reads, and for `DATABASE_URL`):
- `prisma validate --schema phaseC2-schema.prisma`: **valid**.
- `prisma migrate diff --from-empty --to-schema phaseC2-schema.prisma --script`: generated the full DDL offline.
- `compare-phaseC2.mjs`: **0 differences** across 12 tables (columns, types, nullability, defaults other than client-side ones),
  unique keys, indexes, 36 foreign keys (with ON DELETE and ON UPDATE) and 11 enumerations. One known limitation: the partial
  index on soft-deleted documents.

What Prisma cannot represent, and how the migration keeps it:

| Object in the SQL draft | Count | How it is kept |
|---|---|---|
| CHECK constraints (dates order, amounts, lengths, the service total, the fault and link rules, the deletion reason) | 40 named | Only in `DRAFT-migration.sql`. The application validators (`record-validation.ts`) mirror them. |
| Append-only, no-delete and column-guard triggers | 14 triggers, 5 functions | Only in `DRAFT-migration.sql`. Verified on PostgreSQL 18. |
| Partial index on soft-deleted documents (`WHERE "deletedAt" IS NOT NULL`) | 1 | Only in the SQL. Prisma cannot express a partial index. |
| Composite foreign key from `VehicleServiceRecord (faultId, vehicleId)` to `VehicleFault (id, vehicleId)` | 1 | In the Prisma schema as a composite relation, with `@@unique([id, vehicleId])` on `VehicleFault`. The database also enforces it. |
| CHAR(64) hash format check (`^[0-9a-f]{64}$`) | 1 | Only in the SQL CHECK. |

**Warning for future schema edits:** Prisma does not manage the objects above. A `prisma migrate dev` run after a change to these
models could propose dropping the partial index, because it cannot re-create it. Reviewers must reject any generated migration that
touches these tables. Future changes to them are made by hand in the SQL migration, and the scratch comparison is re-run.

Intentional differences from the SQL, and not mismatches: `id` values use Prisma's client-side `cuid()`, and `updatedAt` is client-side.
`VehicleMaintenanceReminder.targetRecordId` has no foreign key in either place, because it names a record of several kinds.

## Unresolved mismatches and open questions

1. **Document kind and link.** Neither the SQL nor Prisma requires a document's kind to match the record it links to (for example,
   an INSURANCE_POLICY document linked to an insurance policy). The design does not state the rule, so it is not invented here. The
   school should confirm it, and the application or a CHECK should then enforce it.
2. **Partial index.** Prisma cannot represent it (see above). A later migration tool change would need the SQL to stay the source.
3. **Overlap check.** Insurance overlap is enforced only in the application (under a vehicle row lock). A direct SQL insert bypasses it.
   This is the known gap in `DESIGN.md` section 3.
4. **Service thresholds** remain provisional until the school confirms 14 days and 500 km.

## Warning behaviour for safety-critical faults (admin only)

- An open fault is safety-critical when it makes the vehicle unavailable or has severity CRITICAL (the Phase A definition).
- The administrator sees a warning on the vehicle detail and on the dashboard count of vehicles with an open safety-critical fault.
- The warning never changes availability. Booking is not blocked by faults, and no code changes the vehicle's status because of a
  fault. The earlier `needsStatusSync` and `faultBlocksLessons` rules were removed in this phase.
- Vehicle maintenance data is for administrators only, as `DESIGN.md` section 12 requires. `canAccessVehicleDocuments` covers
  documents only. The route-level check for the warnings and the other records is built in C3, and it is not yet written.

## Pending work (not implemented)

Backend (Phase C3):
- Repository schema change: copy the validated scratch models into `prisma/schema.prisma`, with the back relations on `Vehicle`
  and `User`. Run `prisma validate`. Generate the client locally (no database).
- Server functions for each record type. Each runs in one transaction, locks the vehicle row where the rule needs it, and writes an
  audit row.
- Corrections, renewals and replacements as new rows. Nothing is overwritten.
- Settings persistence: the reminder lead times and the two service thresholds, stored per category and audited. Until then, the
  defaults in code apply and are shown as provisional.
- Reminder generation: `INSERT ... ON CONFLICT DO NOTHING` on the unique key, run by an administrator only. No background scheduler
  and no email.

Document storage:
- Upload and download routes that reuse the payment-slip helpers (`src/lib/student/payment-slips.ts`): the type from the bytes, 5 MB
  limit, random storage key, private folder, SHA-256 checked on read, attachment downloads with `nosniff` and `no-store`.
- Replacement and soft delete as defined in `DESIGN.md` section 8. Retention review after 365 days; nothing purged automatically.

Permissions and audit history:
- Admin-only routes and server actions on every request (`requireUser` with `[UserRole.ADMIN]`). Cross-vehicle requests refused.
- Audit history view for each vehicle.

Routes and UI (Phase D):
- Admin dashboard with server-computed counts and filters, and the in-app reminder list.
- Vehicle detail sections: Overview, Insurance, Emission Test, Revenue Licence, Service and Inspection, Documents, History.
- Forms with server-side validation, duplicate-submission protection, and loading, empty and error states.

Verification (Phase E):
- Integration tests on approved fixtures only, with before and after counts. No seed or reset of shared data.
- The admin flow as an end-to-end test on an isolated fixture vehicle, with tracked cleanup.

## Recommended next phase

**C3: repository schema, client and the server layer, approved as one batch.** It is the first point where the maintenance models
can be used by code. It depends on the decisions above, which are now recorded. It is still not a migration to a shared database.
Steps: copy the validated models into the repository schema; generate the client locally; write the server functions with audit
writes and admin checks; test them against a disposable PostgreSQL 18 container, as in C1. The migration itself stays a draft
until a separate shared-database approval is given.

Phase D (UI) should wait for C3, because the screens need the server functions and their validation messages.

## Explicitly out of scope

- Automatic email or SMS reminders, and any background scheduler.
- A permanent instructor-to-vehicle assignment.
- Booking-time blocking because of a fault (school decision: warning only).
- Automatic purge of documents.
- Any renewal period or testing interval that the school has not confirmed.
- A database extension (for example `btree_gist`).
