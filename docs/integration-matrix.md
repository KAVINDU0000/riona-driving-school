# Integration test matrix

Built from the code, not from the test names. Coverage was found by search:
- **Route coverage:** which Vitest files import each API route (`tests/*.test.ts` importing `app/api/.../route`).
- **Module coverage:** which Vitest files import each library module.
- **E2E coverage:** which Playwright specs reach each page.

Counts at the time of writing: 39 API routes, 28 portal pages, 15 public pages, 56 library modules, 90 components,
50 Vitest files, 10 Playwright specs.

Status key: **Covered** (a test exercises the journey through the real route or action), **Partial** (only the rules are
tested, or only part of the journey), **None** (no test).

## A. Student registration, selection, submission, approval and enrollment

| Journey | Components / routes / models | Existing coverage | Gap | Test needed |
|---|---|---|---|---|
| Public package list and selection | `signup/page.tsx`, `PackageSelect`, `getPublicPackageCatalog`, `TrainingPackage` | `signup-session-markup` (markup), `e2e/inactive-packages` (listbox) | Browser run of the six packages not yet done | Browser: listbox names and selectors (spec written, not run) |
| Session selection (Regular fixed, Trial 1–5, mixed) | `SignupForm`, `session-rules`, `POST /api/registration`, `RegistrationSessionSelection` | `session-rules`, `catalog-session-rules` (unit); `mixed-package-sessions` (route, 60 pass) | Regular happy path through the route not tested in the DB | Route test: Regular 15 persists and approval copies it |
| Submission and refusal of tampered input | `POST /api/registration`, `parseRegistrationInput`, `submitRegistration` | `registration.test`, `mixed-package-sessions`, `registration-sessions` | Duplicate-pending migration not applied (proposal only) | Covered for current rules; none for duplicates |
| Duplicate application by the same person | `RegistrationRequest` | None | Proposal only | Awaiting the duplicate-pending decision |
| Approval (stored selections) | `POST .../approve`, `approveRegistration`, `Enrollment`, `EnrollmentTrainingRequirement` | `approval-cases`, `admin-registrations` (22), `mixed-package-sessions` | Route-level approval for Regular stored selections | Route test: Regular stored 15 copied to requirement |
| Approval (fallback, unconfirmed or null count) | same, package items | `approval-cases`, `admin-registrations` | None for these cases | Covered |
| Rejection | `POST .../reject`, `rejectRegistration` | `admin-registrations` (rejection block), `admin-registration-queue` (history) | None | Covered |
| Admin queue, search, paging, detail | `GET /api/admin/registrations`, `listRegistrations`, `getRegistration` | `admin-registration-queue` (13) | None | Covered |
| Payment submission and slip upload | `POST /api/registration/payment`, `submitApplicationPayment`, `PaymentSlip` | `payment-submission` (reset-based, not run), `application-status` (reset-based) | Both suites still reset the database | Refactor to fixtures (batch planned) |
| Payment review by admin | `POST /api/admin/payments/[id]/review`, `PaymentReviewHistory` | `application-status` (reset-based) | Suite not isolated; `lib/admin/payment-review` imported by no test | Refactor, then a review-history test |
| Enrollment and requirements after approval | `Enrollment`, `EnrollmentTrainingRequirement`, `entitlements.ts` | `entitlement-confirmation` (reset-based), `entitlement-rules`, `entitlement-input` | Reset-based suite | Refactor to fixtures |

## B. Lesson booking and scheduling

| Journey | Components / routes / models | Existing coverage | Gap | Test needed |
|---|---|---|---|---|
| Student books a lesson | `POST /api/student/lessons`-family, `lesson-booking.ts`, `LessonSchedule` | `student-booking` (reset-based) | Reset-based; the booking-time fault check is not built | Refactor; add booking refusal for an open blocking fault (needs migration) |
| Booking refused for a non-ACTIVE vehicle | `lesson-booking.ts` (status filter) | `student-booking` (reset-based) | Reset-based | Refactor |
| Instructor availability and calendar | `InstructorAvailability`, `instructor-profile-and-calendar` | `instructor-profile-and-calendar` (DB-free rules) | No route-level test | Route/integration test for availability writes |
| Instructor lesson list | `GET /api/instructor/lessons`, `instructor-lessons` | `instructor-lessons` (reset-based) | Reset-based | Refactor |
| Attendance | `POST .../attendance` | None | No route test; `instructor-lessons` covers rules only | Route test: attendance refused for future or cancelled lessons |
| Complete a lesson | `POST .../complete` | None | No route test | Route test: complete only with attendance recorded |
| Feedback | `POST .../feedback` | None | No route test | Route test: feedback only on completed lessons |
| Cancel a lesson | `POST .../cancel`, `lesson-cancellation` (reset-based), `lesson-cancellation.spec.ts` (E2E, seeded) | Reset-based and seeded E2E | Both not isolated | Refactor |
| Vehicle taken out of service during scheduled lessons | `POST /api/admin/vehicles/[id]/status`, `changeVehicleStatus` | `admin-vehicles` (reset-based), `lesson-cancellation` | Reset-based | Refactor |

## C. Vehicles, instructors and availability

| Journey | Components / routes / models | Existing coverage | Gap | Test needed |
|---|---|---|---|---|
| Vehicle list, create, edit | `/api/admin/vehicles`, `/api/admin/vehicles/[id]`, `Vehicle`, `VehicleAuditLog` | `admin-vehicles` (reset-based, 393 lines) | Reset-based | Refactor to fixtures |
| Vehicle status change with resolutions | `/api/admin/vehicles/[id]/status`, `changeVehicleStatus` | `admin-vehicles`, `lesson-cancellation` | Reset-based | Refactor |
| Vehicle eligibility for activation | `vehicle-eligibility.ts` | `vehicle-eligibility` tests? (not directly imported) | No direct test | Unit test of the blockers |
| Instructor provisioning | `POST /api/admin/instructors`, `instructor-provisioning` lib | `instructor-provisioning` (reset-based); `lib/auth/instructor-provisioning` imported by no test | Reset-based; lib not tested directly | Refactor; unit test the lib |
| Instructor profile | `/api/instructor/profile`, `instructor-profile` | `instructor-profile` (seed-based) | Seeded | Refactor |
| Instructor-to-vehicle assignment | **No persistent assignment exists.** Vehicles are chosen per lesson. | None | Decision needed: a persistent assignment, or per-lesson only | Decision first |
| Faults, repairs, insurance, service, documents | **Not built** (design and rules only; see `docs/vehicle-maintenance`) | Rules: `vehicle-maintenance-rules` (43). Storage: `slip-storage` (8) | No routes, UI, schema or client | Needs migration (see plan) |
| Document permissions | Storage helper; admin-only rule | Rule only | No route | Needs routes (after migration) |

## D. Students, accounts and authentication

| Journey | Components / routes / models | Existing coverage | Gap | Test needed |
|---|---|---|---|---|
| Student login | `POST /api/auth/student/login` | `login`, `sessions`, `authorization`, and others (reset-based) | Reset-based | Refactor (partly done: `sessions`) |
| Admin and instructor login | `/api/auth/admin/login`, `/api/auth/instructor/login` | `login`, `bootstrap-admin`, `admin-account` (reset-based) | Reset-based | Refactor |
| Logout and session replay | `POST /api/auth/logout` | `sessions` (now fixture-based, batch 3) | Not yet run | Run (done in batch 3) |
| Password change (atomic) | `POST /api/account/password`, `changePassword` | `password-change-atomicity` (batch 2, passed) | None | Covered |
| Password reset | `/api/auth/password-reset/*` | `password-reset` (reset-based) | Reset-based | Refactor |
| Email change | `/api/account/email/*` | `email-change` (reset-based), `email-delivery` | Reset-based | Refactor |
| Role permissions on every route | all admin routes | `authorization` (reset-based) | Reset-based; several routes have no direct test | Refactor; add route coverage |
| Student profile | `/api/student/profile` | `student-portal` (seed-based) | Seeded | Refactor |
| Student portal pages | 12 `portal/student/*` pages | `student-portal`, `student-account`, `admin-dashboard` (seed-based) | Seeded; not all pages have a test | Refactor; add page coverage |
| Entitlements (admin) | `/api/admin/enrollment-requirements/.../confirm` | `entitlement-confirmation` (reset-based) | Reset-based | Refactor |

## E. Payments and payment slips

| Journey | Components / routes / models | Existing coverage | Gap | Test needed |
|---|---|---|---|---|
| Student uploads a payment slip | `POST /api/student/payments/[id]/slips`, `uploadPaymentSlip` | `student-payments` (seed-based, 164 lines) | Seeded; uses `seedStudentWorld` | Refactor |
| Student downloads own slip | `GET /api/student/payments/slips/[id]` | `student-payments` | Seeded | Refactor |
| Admin downloads a slip | `GET /api/admin/payment-slips/[id]` | `payment-submission` (reset-based) | Reset-based | Refactor |
| Slip validation and storage helpers | `payment-slips.ts` | `slip-storage` (DB-free, 8) and `student-payments` | Helper checks only | Covered at helper level |
| Payment amounts unchanged | `packagePriceAtSubmission`, payment flows | `package-pricing` (DB-free) | None at route level | Route test on a fixture package |

## F. Cross-cutting

| Concern | Coverage | Gap |
|---|---|---|
| Audit and history (`VehicleAuditLog`, `EnrollmentRequirementChange`, `PaymentReviewHistory`) | Partly, in reset-based suites | Append-only triggers are not tested against a database |
| Validation errors | Route tests for registration and admin routes | Most routes have no validation test |
| Error handling (401, 403, 404, 409, 422) | `admin-registrations`, `approval-cases`, `sessions` | Many routes not covered |
| `health` and `contact` routes | None | Add a route test for each |

## G. Playwright (E2E)

| Spec | Reaches | Seeds or resets? | Status |
|---|---|---|---|
| `additional-vehicle-sessions.spec.ts` | Signup, listbox, payload | No (UI-only) | Run on `team-testing`: 20 passed |
| `inactive-packages.spec.ts` | Signup, listbox, API | Toggles `trial-van` on local DB | Not run (local) |
| `daily-packages.spec.ts` | Signup daily products | Global setup (truncates) | Not run |
| `public-site.spec.ts` | Public pages | Global setup | Not run |
| `application-status.spec.ts` | Status, payment | Seeds via `execSync` | Not run |
| `payment-slip.spec.ts` | Slip upload | Seeds via `execSync` | Not run |
| `admin-portal.spec.ts` | Admin pages | Seeds via `execSync` | Not run |
| `admin-vehicles.spec.ts` | Vehicle pages | Seeds via `execSync` | Not run |
| `instructor-portal.spec.ts` | Instructor pages | Seeds via `execSync` | Not run |
| `lesson-cancellation.spec.ts` | Cancellation flow | Seeds via `execSync` | Not run |

## Priority order for the missing tests

1. Routes with no test at all: `contact`, `health`, instructor attendance, complete and feedback.
2. The reset-based Vitest suites (about 30 files), in batches, with fixtures.
3. The seeded E2E specs (six), with fixtures.
4. Vehicle maintenance routes and UI: after the migration and client.
5. Decisions still open: instructor-to-vehicle assignment, and the duplicate-pending registration rule.
