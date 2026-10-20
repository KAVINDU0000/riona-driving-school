# Vehicle maintenance and compliance: design (Phase A, revised)

Status: design and draft only. Phase A is approved for design and migration-draft revision. Nothing here is applied.
- `DRAFT-migration.sql` is NOT in `prisma/migrations`. It has been run only on a disposable PostgreSQL 18 container (Phase C1,
  section 19). It has not been applied to team-testing, production or any other shared database.
- `DRAFT-rollback.sql` has been run only on the same disposable container (section 19).
- `prisma/schema.prisma` is unchanged in Phase A. The models are validated only in a scratch copy.
- No code, UI or route is written in Phase A.

Confirmed decisions (from the school): VET applicability and due dates are entered manually. Revenue Licence due dates are
entered manually until renewal rules are verified. Reminders are in-app only, with no email and no background scheduler.
Currency is LKR. Instructor-to-vehicle assignment stays per lesson. Expired insurance and overdue service are warnings, and
do not block booking. Safety rules still apply. Insurance overlap is checked in the application. Documents are admin-only.
Soft-deleted documents are kept 365 days, then marked for review, and are never purged automatically.

No universal validity period, testing interval, licence period or service interval is assumed anywhere in this design.

## 1. Repository facts (verified)

- `Vehicle` (`prisma/schema.prisma`): `id`, `vehicleType`, `registrationNumber` (unique), `make`, `model`,
  `manufacturingYear`, `colour`, `transmissionType`, `status` (ACTIVE, MAINTENANCE, INACTIVE), `description`, timestamps.
  Lessons reference a vehicle through `(id, vehicleType)`. `VehicleAuditLog` is append-only.
- `User` is keyed by `userId` (text). Every new foreign key to a user uses `userId`.
- Money: `Decimal(10,2)` on `Payment.amount`, `TrainingPackage.price`, `Enrollment.agreedPrice/finalFee`,
  `TrainingPackagePriceChange`. Amounts are shown with `formatLkr` (`src/lib/packages/format.ts`), which gives "LKR 26,000".
  **LKR decision:** there is no currency column in the schema, and none is added. Every amount is LKR, as every existing amount
  is. The UI labels amounts "LKR". If a second currency is ever needed, that is a separate change.
- Date and time: school time is `Asia/Colombo` (`src/lib/student/time.ts`). Dates are stored as `DATE` columns and handled as
  "YYYY-MM-DD" strings. Every rule takes "today" as an argument. The server computes every status. The browser never does.
- Existing migrations end at `20261021130000_registration_session_selection`. The proposed name is
  `20261022120000_vehicle_maintenance`, which is later than all of them.
- Payment-slip storage (`src/lib/student/payment-slips.ts`): type from the bytes, 5 MB limit, random key, private folder
  (`/private-storage/` is git-ignored), attachment downloads with `nosniff` and `no-store`, authorised reads.

## 2. Data model (see `DRAFT-migration.sql`)

Twelve new tables. Every table references `Vehicle` and `User` with `RESTRICT`. History is never cascaded away.

| Table | Purpose | Mutability | Key constraints |
|---|---|---|---|
| `VehicleInsurancePolicy` | One insurance period. Insurer, policy number, coverage, coverage details, start and expiry dates, premium (LKR), notes | Append-only | expiry after start; premium ≥ 0; policy number and insurer present |
| `VehicleComplianceDecision` | A "not applicable" decision, or a documented exception, for EMISSION_TEST or REVENUE_LICENCE, with a reason | Append-only; the newest row for a vehicle and category is in force | reason 1–1000 characters |
| `VehicleEmissionTest` | One test or certificate: test date, result, certificate number, issue and expiry dates, next due date, testing centre, notes | Append-only; a correction supersedes a row | expiry on or after issue; next due on or after the test; result PASS or FAIL or absent |
| `VehicleRevenueLicence` | One licence period: licence number, issue date, renewal date, due date, notes | Append-only; a renewal is a new row that points at the one it renews | due on or after issue; renewal on or after issue |
| `VehicleServiceRecord` | One service or inspection: category, service date, odometer, provider, work performed, findings, recommendations, parts, labour, total, next service date and odometer, notes | Append-only; a correction supersedes a row | odometer ≥ 0; total = parts + labour; next service on or after the service; next odometer not below the reading |
| `VehicleServiceChecklistItem` | One checklist result per item per service record (engine, brakes, suspension, steering, tyres, battery, lights, leaks, electrical) | Append-only | one row per item per record |
| `VehicleFault` | A fault and its current repair state | State columns may change; reported facts never change; no deletes | severity and status enums; cost ≥ 0; completion date only when COMPLETED |
| `VehicleRepairEvent` | The repair history of a fault | Append-only | event type check |
| `VehicleMaintenanceDocument` | Metadata for one stored file, linked to at most one record | Only the soft-delete columns change, once; no deletes | JPEG, PNG or PDF; 1 byte to 5 MB; SHA-256 format; one link at most |
| `VehicleMaintenanceReminder` | An in-app reminder for one target record, one due date and one lead time | Status and acknowledgement may change; identity never changes; no deletes | unique (vehicle, category, target record, due date, lead days) |
| `VehicleMaintenanceReminderSetting` | The lead times an administrator sets per category (defaults applied by the application) | Rows may be added and removed, and each change is audited | lead days 1–365 |
| `VehicleMaintenanceAuditLog` | One row for every create, correction, renewal, decision, upload, soft delete and reminder change | Append-only | entity type check |

Enumerations: `ComplianceCategory`, `ComplianceDecisionKind`, `EmissionTestResult`, `ServiceCategory`, `ChecklistItem`,
`ChecklistResult`, `FaultSeverity`, `RepairStatus`, `MaintenanceDocumentKind`, `ReminderCategory`, `ReminderStatus`.

Indexes: vehicle plus date, on each table that is read by date (policy expiry, test expiry, test next due, licence due,
service date, service next due). A partial index on soft-deleted documents supports the retention review. A unique key on
reminders makes generation idempotent.

## 3. Insurance

- **Fields.** Insurer, policy number, coverage type, coverage details, start date, expiry date, premium (LKR), notes, and an
  optional document. Creation and last change are recorded (`recordedAt` and `recordedByUserId`).
- **Current policy.** The period that covers today, or, if none does, the next one, or, if all have ended, the most recent.
- **States.** ACTIVE; EXPIRING_SOON (30 days or fewer left; the expiry day itself counts as covered); EXPIRED (the day after the
  expiry day); NOT_YET_STARTED; MISSING (no policy ever recorded). The 30-day window is a default. Phase B moves it to the
  reminder settings. It is not a validity period.
- **Renewal.** A new row whose `renewsPolicyId` points at the period it replaces. The old row is not changed. The renewal must
  start after the period it renews, and must belong to the same vehicle.
- **Correction.** A new row whose `supersedesId` points at the wrong row, with a reason in the audit log. The wrong row stays
  visible in history, marked as superseded.
- **Overlap.** Checked in the application under a row lock on the vehicle, before any insert. Two periods overlap when their
  date ranges share a day, including the start and end days. A period may start the day after another ends. There is no
  database extension. **Known race:** two administrators inserting at the same moment are serialised by the lock only if both
  go through the same code path. A direct SQL insert is not checked. The `UNIQUE (vehicle, policy number, start date)` key
  stops the same policy being entered twice.

## 4. Vehicle Emission Test (VET)

- **Applicability.** Administrators record it manually, as a `VehicleComplianceDecision` for EMISSION_TEST:
  - NOT_APPLICABLE, with a reason; or
  - EXCEPTION_DOCUMENTED, with a reason and a document.
  Without a decision, a vehicle with no test is NOT RECORDED. Nothing is assumed about which vehicles need a test.
- **Test records.** Test date, result (PASS or FAIL, or none recorded), certificate number, issue date, certificate expiry date,
  next due date, testing centre, notes, and the certificate document. Each new test is a new row. A correction supersedes a row.
  History is never removed.
- **Due date.** The administrator enters the next due date, or the certificate expiry date, or both. **No testing interval
  is assumed.** If neither date is entered for the latest test, the status is DUE DATE MISSING, and that is never treated as valid.
- **States** (computed on the server, for the latest test that is not superseded):
  - NOT APPLICABLE: the newest decision is NOT_APPLICABLE.
  - NOT RECORDED: there is no test and no decision.
  - DUE DATE MISSING: a test exists, but neither date is recorded.
  - EXPIRED: the certificate expiry date is before today.
  - OVERDUE: the next due date is before today.
  - DUE SOON: the earlier of the two dates is within the reminder window.
  - VALID: the earlier date is beyond the window.
  - Where both dates exist, the earlier one decides, and the label says which one (expired or overdue).
  - A recorded FAIL result is shown as FAILED, whatever the dates say (school decision, Phase C2). The date that would otherwise
    decide, if one is recorded, stays visible.
  - No result is inferred from a certificate or due date. When the result is not recorded, the state says so.

## 5. Revenue Licence

- **Records.** Licence number, issue date, renewal date, due date, notes, and the licence document. A renewal is a new row whose
  `renewsLicenceId` points at the one it replaces. Nothing is marked renewed automatically.
- **Due date.** The administrator enters the due date. **No renewal period is assumed**, and no period is calculated from the
  registration date, until the renewal rule is verified for the vehicle category and jurisdiction.
- **States:** NOT RECORDED (no licence), NOT APPLICABLE (decision), DUE SOON, OVERDUE (due date before today), ACTIVE.
- **Prerequisite indicators.** Before a renewal is recorded, the form shows, for the due date of the renewal:
  - the insurance state on that date (from section 3); and
  - the VET state on that date (from section 4).
  Missing or expired prerequisites are shown in red, with the date they lapsed or are missing.
- **Proposed, needs your confirmation:** a renewal with a prerequisite not valid on the due date can still be recorded, but
  the administrator must confirm it on the form, and the confirmation and the prerequisite states are written to the audit log.
  The alternative is to refuse the renewal. The current design does not refuse it.
- **Legal caveat.** The system holds application records. It does not verify a licence with any authority, and it never says a
  licence is officially valid because a row exists.

## 6. Service and mechanical inspection

- **Records.** Category (routine service, mechanical inspection, corrective service), service date, odometer reading, provider,
  work performed, findings, recommendations, parts cost, labour cost, total cost, next service date, next service odometer
  reading, notes, and the invoice or report document. Each record is kept. A correction supersedes a row.
- **Checklist.** Nine items: engine, brakes, suspension, steering, tyres, battery, lights, leaks, electrical. Each has a result
  (PASS, ATTENTION, FAIL, NOT CHECKED) and a note. The list is held in application code, not in the database.
- **Intervals.** Next service date and next service odometer reading are entered by the administrator. **No interval is
  assumed.** A record may have a date, an odometer reading, or both.
- **States are derived, not stored.** There is no service status column. The state comes from the latest valid record (the
  newest service date that is not superseded) and its next service date and next odometer reading, compared with today and
  the current odometer.
  - NOT SET: that record has neither a next service date nor a next service odometer reading.
  - SCHEDULED, DUE SOON, OVERDUE (the date is past, or the odometer has reached the due reading).
  - A repair's state moves forward only (section 7). A service record has no state to move.
  - DUE SOON on the date counts as 14 days or fewer. On the odometer it counts as 500 km or fewer. Both are PROVISIONAL defaults,
    pending school confirmation (school decision, Phase C2). They are configurable settings (MaintenanceSettings), not permanent rules.
  - Due on the day itself is DUE SOON, and the day after is OVERDUE.
- **Mileage status when no reading is known.** The UI shows "mileage-based status cannot be determined". It never shows
  "up to date". The current reading is the latest odometer on any service record. There is no separate odometer log.
- **Odometer regression.** A new reading lower than the latest reading is refused, unless an explanation is given. The
  explanation is written to the audit log.
- **Costs.** Parts and labour are kept separately. The total is their sum, computed in cents. The database checks the sum.
  The application checks the same sum in cents before the insert (`checkServiceRecord` in `record-validation.ts`), so the user
  sees the message rather than a database error.
- **Cost summary.** Completed service and repair costs only. Open items are not counted.

## 7. Faults and repairs (supporting feature, same migration)

- A fault has a severity, a description, and a flag saying whether it makes the vehicle unavailable. Its repair state moves
  forward only (REPORTED, DIAGNOSED, IN REPAIR, COMPLETED or CANCELLED).
- **Safety-critical faults are an administrator warning only** (school decision, Phase C2). An open fault is safety-critical when it
  makes the vehicle unavailable or has severity CRITICAL. It is shown as a warning to administrators. It does NOT block vehicle
  booking, and no code changes a vehicle's status because of a fault.
- Lesson availability is unchanged: a vehicle is offered only when its status is ACTIVE. INACTIVE and MAINTENANCE vehicles remain
  unavailable, as before.
- Opening or closing a fault never changes the vehicle's status automatically. An administrator changes the status through the
  existing status change.
- There is no booking-time fault check, and none is planned in this design. Phase C2 removed the earlier plan for one.

## 8. Documents

- **Kinds.** Insurance policy, emission certificate, revenue licence, service invoice, inspection report.
- **Access.** Administrators only, on every route. Students and instructors have no access.
- **Storage.** Reuses the payment-slip design: type from the bytes, 5 MB limit, random key, private folder, exclusive write, file
  written before its row, and the file removed if the row write fails. SHA-256 is stored and checked on each read.
- **Replacement.** A new document row whose `replacesDocumentId` points at the old one. The old row is soft-deleted in the same
  transaction, with a reason. Both writes are audited.
- **Soft delete.** Sets `deletedAt`, `deletedByUserId` and `deletionReason`, once. The row and the file are kept.
- **Retention.** 365 days after `deletedAt`, a deleted document is kept. From day 365 it is marked REVIEW DUE. An administrator
  reviews it, and decides. Nothing is removed automatically.
- **Download.** Attachment, with `nosniff` and `no-store`. A PDF is never shown inline.

## 9. Reminders (in-app only)

- **Categories.** Insurance, emission test, revenue licence, service.
- **Generation.** A server function looks at each record's due date, for each lead time in the settings. It inserts a reminder
  with `INSERT … ON CONFLICT DO NOTHING` on the unique key. Running it twice inserts nothing new. Nothing runs on page load
  alone: the dashboard reads reminders, and an administrator starts generation.
- **Lead times.** The settings table holds the chosen lead times per category. If there are none, the application uses
  30, 14 and 7 days. Changes are audited.
- **Renewal or new service.** A new target record gets its own reminders. Reminders for the old target are marked SUPERSEDED.
  They are not deleted.
- **Acknowledgement.** An administrator can acknowledge a reminder. This records who and when.
- **Delivery.** In-app only. There is no email, no outbox, and no background scheduler. The admin dashboard shows the open
  reminders. This is stated on the dashboard.

## 9a. Dashboard (admin)

Counts from the database, computed on the server: vehicles monitored; vehicles with missing insurance, VET or licence records;
policies expiring soon and expired; VET due soon, expired and overdue; licences due soon and overdue; services due soon and
overdue; vehicles with an open safety-critical fault (a warning only). Filters: vehicle, category, status, due-date range. Every count opens the
vehicle or record it counts. Loading, empty, permission-denied and error states are required.

## 10. Vehicle detail sections

Overview (the status of the four categories and any open fault), Insurance, Emission Test, Revenue Licence, Service and
Inspection, Documents, and History. Each section has the create, view, correct and history actions it needs, and each
destructive action asks for confirmation.

## 11. Audit history

Every create, correction, renewal, decision, document upload, replacement and soft delete, every reminder acknowledgement, and
every change to the reminder settings writes one `VehicleMaintenanceAuditLog` row. Each row holds the actor, the time, the
action, the target record, a reason where one is needed, and a summary of field names and values. The summary holds no file
content, no secret and no personal data beyond what the record already shows.

## 12. Authorisation

Every maintenance route, server action and document route checks, on the server, that the caller is an administrator. The
check runs on every request, not only on the page. A cross-vehicle request is refused: a record id must belong to the vehicle in
the URL. Errors return the status code and a safe message, never the database detail.

## 13. Backward compatibility

- Additive only. No existing table is altered. No existing row is written.
- Existing vehicles have no maintenance records. Every category shows NOT RECORDED or MISSING, never valid.
- Booking, lessons, registrations, payments, packages, enrollments and student or instructor pages are unchanged in Phase A.
- Per-lesson vehicle selection is unchanged. No persistent instructor-to-vehicle assignment is added.

## 14. Compatibility review (Phase A)

Done without a database:
- `prisma validate` passes on a scratch copy of `schema.prisma` with the Phase A models and the back-relation fields on `Vehicle`
  and `User`. The repository schema is unchanged.
- The SQL draft has 149 named objects. Every identifier is 63 characters or fewer. There are no duplicate names. Every table or
  function a constraint, index, foreign key or trigger refers to exists in the draft.
- The rollback drops exactly the 12 tables, 5 functions and 11 enumerations the migration creates (checked programmatically).

Findings:
- **Model and relation conflicts:** none found. The relations are named where a model has more than one relation to another
  (for example, policy renewal and policy supersession, and each user relation).
- **Migration failure risk:** the new objects are not used by any existing table, so there is nothing for existing data to
  violate. Phase C1 has since run the SQL on a disposable PostgreSQL 18 container (section 19). That run is the only database
  evidence; nothing has been applied to a shared database.
- **Nullable and legacy data:** every new date and money column that can be absent is nullable, and the application treats
  absence as MISSING, never as valid.
- **Indexes and constraints:** the unique reminder key is the idempotency guard. The service total check requires exact
  agreement with the parts and labour sum, so the application must compute the total in cents.
- **Prisma Client:** the models are not in the repository schema yet, so no client has been generated for them. Generating
  the client requires the repository schema to change, which happens in Phase B.
- **Schema drift:** the repository schema and the migration folder are unchanged, so there is no drift to repair.

## 15. Business decisions still needed before Phase B

Recorded in Phase C2: a recorded VET FAIL is shown as FAILED (item 4, for FAIL); safety-critical faults give an administrator
warning only and never block booking; the 14-day and 500 km service thresholds are provisional, pending school confirmation.

1. **Revenue Licence prerequisites.** Warn with a recorded confirmation (proposed in section 5), or refuse the renewal?
2. **Warning windows.** Confirm 30, 14 and 7 days as the starting defaults, or name other values.
3. **Current odometer.** Accept the latest service-record reading as the only source, or add a separate odometer log?
4. **VET results.** Confirm the result vocabulary: PASS and FAIL only?
5. **Corrective service and faults.** Should a corrective service be linked to a fault? The draft does not link them.

## 16. Rollback

`DRAFT-rollback.sql` drops the twelve tables, five functions and eleven enumerations, in dependency order. It destroys all
rows in those tables, and it does not remove uploaded files. Run it only while every table is empty, or after a verified backup
and the owner's written acceptance. The file gives a count check to run first.

## 17. Migration name and timing

`20261022120000_vehicle_maintenance`. It is applied to a shared database only after: the Phase B decisions, the PostgreSQL
checks in section 14, and a separate approval.

## 18. Phase B (database-free) and the proposed schema change

Status: Phase B rules are implemented and tested without a database. The schema change below is a DRAFT, for review and approval.
Nothing is applied, and `prisma/schema.prisma` is unchanged.

### 18.1 What Phase B implements (`src/lib/vehicles/compliance-rules.ts`, `tests/vehicle-maintenance-phase-b.test.ts`)

- **VET status:** NOT APPLICABLE, EXCEPTION DOCUMENTED, NOT RECORDED, DUE DATE MISSING, FAILED, EXPIRED, OVERDUE, DUE SOON, VALID.
  The earlier of the certificate expiry and the next due date decides, and the label says which one. A result is PASS, FAIL, or
  not recorded. A missing result is never inferred.
- **Revenue Licence status:** NOT APPLICABLE, EXCEPTION DOCUMENTED, NOT RECORDED, OVERDUE, DUE SOON, ACTIVE. It never states
  that a licence is officially valid: every prerequisite result carries `legalVerification: "NOT_VERIFIED"`.
- **Renewal prerequisites on the renewal date** (not today): insurance and VET are each checked for the date of the renewal.
  Each missing or invalid prerequisite is a warning. A renewal with warnings needs a recorded confirmation
  (`requireRenewalConfirmation`). The confirmed warnings and statuses are returned for the audit log. A warning alone never
  blocks a renewal.
- **Reminder windows:** configurable lead times, defaults 30, 14 and 7 days, validated (whole, 1–365, unique, at most five).
  A window is open on each day from the lead day through the due date. `reminderKey` gives the idempotency key that the
  database unique key also uses.
- **Checklist:** all nine items are always stored. An item that is not sent is NOT CHECKED, never a pass. Notes are trimmed and
  limited to 500 characters.
- **Odometer:** the current reading is the latest valid, non-superseded service reading. A lower reading is refused unless an
  explanation is given, and an explained regression is marked for audit. With no reading, mileage status is CANNOT DETERMINE.
- **Corrective service link:** only a corrective service may link to a fault, and only for the same vehicle. A routine service or
  inspection never needs a link.

- **Document kinds** are the five database values only: INSURANCE_POLICY, EMISSION_CERTIFICATE, REVENUE_LICENCE,
  SERVICE_INVOICE, INSPECTION_REPORT. The earlier names are refused.
- **Application validation** (`src/lib/vehicles/record-validation.ts`) mirrors the database limits so the user sees a message
  before the insert: document name 1–200 characters; insurer 1–200; policy number 1–100; coverage type present and 1–200;
  premium exact to the cent, zero or more, at most 99,999,999.99; expiry after start; emission certificate expiry on or after
  issue, next due on or after the test, certificate number 1–100; revenue licence due and renewal on or after issue; service
  total equal to parts plus labour in cents; service odometer whole and not negative; next service on or after the service;
  fault description 1–2000 characters and completion not before the report; decision reason 1–1000 characters.

Tests: `tests/vehicle-maintenance-phase-b.test.ts` (35 tests, injected date), `tests/vehicle-maintenance-rules.test.ts` (rule
tests, including the derived service state) and `tests/vehicle-record-validation.test.ts` (validation, and the latest-record rule).
All three pass without a database: 104 tests in total (Phase C2).

### 18.2 Proposed schema diff (for review; NOT applied)

Only one change is needed: an optional link from a service record to a fault. Nothing else in the Phase A design changes.

Draft SQL, `DRAFT-migration.sql` (already updated in the draft only):
- `VehicleServiceRecord`: new nullable column `"faultId" TEXT`.
- `VehicleServiceRecord`: CHECK `faultId IS NULL OR category = 'CORRECTIVE_SERVICE'`.
- `VehicleFault`: UNIQUE (`id`, `vehicleId`), so that a composite key can name the vehicle.
- `VehicleServiceRecord`: composite foreign key (`faultId`, `vehicleId`) referencing `VehicleFault`(`id`, `vehicleId`), with
  RESTRICT. The database therefore refuses a link to a fault on another vehicle. A null link is not checked.
- Index on `VehicleServiceRecord`(`faultId`).

Prisma (scratch copy only, validated with `prisma validate`):

```prisma
// VehicleServiceRecord
faultId  String?
fault    VehicleFault? @relation("ServiceFaultLink", fields: [faultId, vehicleId], references: [id, vehicleId], onDelete: Restrict)

// VehicleFault
linkedServices VehicleServiceRecord[] @relation("ServiceFaultLink")
@@unique([id, vehicleId])
```

Compatibility:
- Additive. The new column is nullable, so every existing or future routine record has no link. Nothing existing is written.
- A fault link is written only when a corrective service is recorded. The service record is append-only, so the link cannot be
  changed later. The fault keeps its own history, and the link does not change the fault's status.
- Rollback: the rollback still drops the service table as a whole, so the new column, index and key go with it. The
  mechanical check still matches the migration exactly.
- Verified on PostgreSQL 18 (section 19): the composite key refuses a link to another vehicle's fault, a link to a
  non-existent fault is refused, a link on a routine or inspection record is refused, and a null link is accepted.

## 19. Phase C1: PostgreSQL 18 verification and static checks

Scope: the migration draft and the rollback draft were run on a disposable `postgres:18` container (18.6). The container was
bound to `127.0.0.1` on a new port, had in-memory storage, and had no project or shared volume mounted. It was not connected
to team-testing, production, or any other database, and the application's test suite was not run against it. The
Postgres 17 container that already existed on this machine was not used.

### 19.1 PostgreSQL tests (database evidence)

1. **Repository history.** The 12 existing migrations were applied in order to an empty database. All succeeded.
2. **Migration draft.** `DRAFT-migration.sql` was applied to that database. It created the 12 tables, 11 enumerations and
   5 functions.
3. **Constraint and trigger suite.** `c1-constraint-tests.sql` ran inside one transaction that was then rolled back. It has
   70 PASS notices and no errors, and the script exited with status 0. It covers:
   - the `faultId` link: the nullable link, the same-vehicle composite key (refused on another vehicle's fault), a missing
     fault (refused), and a link on a routine or inspection record (refused);
   - the document deletion reason, and the rule that a deleted document cannot be changed again;
   - the service total, negative costs, odometer, and next-service dates;
   - the reminder acknowledgement pair, and the audit log's immutability.
4. **Defect found and fixed: NULL-passing CHECK.** The document deletion reason check let a NULL result pass, so a row could be
   soft-deleted without a reason. The check now tests `IS NOT NULL` explicitly. The suite passed after the fix.
5. **Defect found and fixed: rollback order.** Dropping `VehicleFault` before `VehicleServiceRecord` fails, because the service
   record depends on it through `faultId`. `DRAFT-rollback.sql` now drops the service table first.
6. **Corrected rollback.** Run after the migration on the same database. Before and after the rollback, the object lists were
   compared: 28 maintenance objects were removed (12 tables, 5 functions, 11 enumerations), none were added, and the existing
   objects were unchanged.

Logs are kept in the scratchpad directory (outside the repository): `c1-run.log`, `rb-orig-run.log`, `rollback-run.log`,
`inv-before-rollback.txt`, `inv-after-rollback.txt`.

### 19.2 Static checks (not database evidence)

- `scratchpad/check-maintenance-sql.mjs`: 154 migration objects, no problems; rollback matches the migration (12 tables,
  5 functions, 11 enumerations; no mismatches). Result: clean.
- Application checks in this phase, all run without a database: `tsc --noEmit`, ESLint on the changed TypeScript files, and
  Vitest on the three vehicle test files (103 tests). The results are in the Phase C1 report.

### 19.3 Still open after Phase C1

- Not applied to any shared database. Approval is still needed, and the migration is still in `docs/vehicle-maintenance/` only.
- The 14-day and 500 km service thresholds and the VET FAILED rule are still unconfirmed by the school.
- The overlap check remains an application check (section 3). A direct SQL insert bypasses it.
- The booking-time fault check (section 7) and the routes, UI, reminder generation and settings persistence are not built.
  They belong to Phase C and later.
- The Prisma Client has not been generated for the new models, and `prisma/schema.prisma` is unchanged, as the boundary requires.

## 20. Phase C2: Prisma integration (static, no database)

Scope and results are recorded in `IMPLEMENTATION-PLAN.md` ("Prisma integration"). In short, and all of it static:
- A scratch copy of the repository schema with the 12 maintenance models and 11 enumerations validates with `prisma validate`
  (dummy URLs, no connection).
- `prisma migrate diff --from-empty --to-schema` generated the DDL for that scratch copy offline. Compared with
  `DRAFT-migration.sql`, the 12 tables, 11 enumerations, 36 foreign keys, unique keys and indexes match. The only expected
  difference is the partial index on soft-deleted documents, which Prisma cannot represent.
- The 40 named CHECK constraints, 14 triggers and 5 functions are not in the Prisma schema. The SQL migration is their only source.
- The repository `prisma/schema.prisma` is unchanged, and no Prisma Client was generated.
