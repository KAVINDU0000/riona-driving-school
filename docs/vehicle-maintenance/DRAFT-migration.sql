-- DRAFT ONLY. NOT APPLIED. NOT IN prisma/migrations.
-- Proposed migration: 20261022120000_vehicle_maintenance  (revised in Phase A to cover the four tracking categories)
--
-- Scope: new tables, enums, functions and triggers. Nothing else changes.
--   * No existing table is altered. No existing row (vehicles, users, registrations, payments, packages, lessons) is written.
--   * No row is inserted. Existing vehicles have no maintenance records. The application shows them as MISSING, never valid.
--   * Money is DECIMAL(10,2) in LKR, the same as Payment.amount, TrainingPackage.price and EnrollmentTrainingRequirement fees.
--     There is no currency column: the project stores every amount in LKR, and the existing schema has no currency column.
--   * No extension is created (no btree_gist). Insurance overlap is checked in the application under a vehicle row lock.
--   * No scheduler, email outbox or notification table. Reminders are in-app records only.
--   * Every foreign key to "Vehicle" and "User" is ON DELETE RESTRICT. History cannot be cascaded away.
--   * Retained history is append-only: triggers refuse UPDATE and DELETE. Corrections are new rows that point at the row
--     they correct (supersedesId). Renewals are new rows that point at the period they renew (renewsPolicyId, renewsLicenceId).
--
-- Naming follows the existing migrations: TEXT ids (cuid), TIMESTAMP(3), CONSTRAINT names "<Table>_<thing>_check|key|fkey".

-- ===========================================================================
-- 1. Enumerations
-- ===========================================================================
CREATE TYPE "ComplianceCategory"        AS ENUM ('EMISSION_TEST', 'REVENUE_LICENCE');
CREATE TYPE "ComplianceDecisionKind"    AS ENUM ('NOT_APPLICABLE', 'EXCEPTION_DOCUMENTED');
CREATE TYPE "EmissionTestResult"        AS ENUM ('PASS', 'FAIL');
CREATE TYPE "ServiceCategory"           AS ENUM ('ROUTINE_SERVICE', 'MECHANICAL_INSPECTION', 'CORRECTIVE_SERVICE');
CREATE TYPE "ChecklistItem"             AS ENUM ('ENGINE', 'BRAKES', 'SUSPENSION', 'STEERING', 'TYRES', 'BATTERY', 'LIGHTS', 'LEAKS', 'ELECTRICAL');
CREATE TYPE "ChecklistResult"           AS ENUM ('PASS', 'ATTENTION', 'FAIL', 'NOT_CHECKED');
CREATE TYPE "FaultSeverity"             AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RepairStatus"              AS ENUM ('REPORTED', 'DIAGNOSED', 'IN_REPAIR', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenanceDocumentKind"   AS ENUM ('INSURANCE_POLICY', 'EMISSION_CERTIFICATE', 'REVENUE_LICENCE', 'SERVICE_INVOICE', 'INSPECTION_REPORT');
CREATE TYPE "ReminderCategory"          AS ENUM ('INSURANCE', 'EMISSION_TEST', 'REVENUE_LICENCE', 'SERVICE');
CREATE TYPE "ReminderStatus"            AS ENUM ('OPEN', 'ACKNOWLEDGED', 'SUPERSEDED');

-- ===========================================================================
-- 2. Shared guard functions
-- ===========================================================================
-- Refuses any UPDATE or DELETE. Used by tables whose rows never change once written.
CREATE FUNCTION "riona_reject_maintenance_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Vehicle maintenance history cannot be changed or deleted' USING ERRCODE = 'check_violation';
END;
$$;

-- Refuses DELETE. Used by tables whose rows may change in a controlled way (see each table).
CREATE FUNCTION "riona_reject_maintenance_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Vehicle maintenance records cannot be deleted' USING ERRCODE = 'check_violation';
END;
$$;

-- ===========================================================================
-- 3. Insurance policies (append-only). A renewal is a new row that points at the period it renews.
--    A correction of a wrong entry is a new row that points at the row it supersedes.
-- ===========================================================================
CREATE TABLE "VehicleInsurancePolicy" (
    "id"               TEXT           NOT NULL,
    "vehicleId"        TEXT           NOT NULL,
    "insurer"          TEXT           NOT NULL,
    "policyNumber"     TEXT           NOT NULL,
    "coverage"         TEXT           NOT NULL,
    "coverageDetails"  TEXT,
    "startsOn"         DATE           NOT NULL,
    "expiresOn"        DATE           NOT NULL,
    "premium"          DECIMAL(10,2)  NOT NULL,
    "notes"            TEXT,
    "renewsPolicyId"   TEXT,
    "supersedesId"     TEXT,
    "recordedByUserId" TEXT           NOT NULL,
    "recordedAt"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleInsurancePolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleInsurancePolicy_dates_check" CHECK ("expiresOn" > "startsOn"),
    CONSTRAINT "VehicleInsurancePolicy_premium_check" CHECK ("premium" >= 0),
    CONSTRAINT "VehicleInsurancePolicy_number_check" CHECK (char_length(btrim("policyNumber")) BETWEEN 1 AND 100),
    CONSTRAINT "VehicleInsurancePolicy_insurer_check" CHECK (char_length(btrim("insurer")) BETWEEN 1 AND 200),
    CONSTRAINT "VehicleInsurancePolicy_vehicleId_policyNumber_startsOn_key" UNIQUE ("vehicleId", "policyNumber", "startsOn"),
    CONSTRAINT "VehicleInsurancePolicy_self_link_check" CHECK ("renewsPolicyId" IS DISTINCT FROM "id" AND "supersedesId" IS DISTINCT FROM "id")
);
CREATE INDEX "VehicleInsurancePolicy_vehicleId_expiresOn_idx" ON "VehicleInsurancePolicy"("vehicleId", "expiresOn");
CREATE INDEX "VehicleInsurancePolicy_renewsPolicyId_idx" ON "VehicleInsurancePolicy"("renewsPolicyId");

-- ===========================================================================
-- 4. Compliance decisions (append-only): "not applicable" or a documented exception, for EMISSION_TEST or REVENUE_LICENCE.
--    The current decision for a vehicle and category is the newest row. A decision always needs a reason.
-- ===========================================================================
CREATE TABLE "VehicleComplianceDecision" (
    "id"               TEXT                      NOT NULL,
    "vehicleId"        TEXT                      NOT NULL,
    "category"         "ComplianceCategory"      NOT NULL,
    "decision"         "ComplianceDecisionKind"  NOT NULL,
    "reason"           TEXT                      NOT NULL,
    "decidedByUserId"  TEXT                      NOT NULL,
    "decidedAt"        TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleComplianceDecision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleComplianceDecision_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 1000)
);
CREATE INDEX "VehicleComplianceDecision_vehicleId_category_decidedAt_idx" ON "VehicleComplianceDecision"("vehicleId", "category", "decidedAt");

-- ===========================================================================
-- 5. Emission tests (append-only). Due dates are entered by an administrator. No interval is assumed.
--    A correction is a new row with supersedesId. Status is derived in the application, never stored.
-- ===========================================================================
CREATE TABLE "VehicleEmissionTest" (
    "id"                TEXT                 NOT NULL,
    "vehicleId"         TEXT                 NOT NULL,
    "testedOn"          DATE                 NOT NULL,
    "result"            "EmissionTestResult",
    "certificateNumber" TEXT,
    "issuedOn"          DATE,
    "certificateExpiresOn" DATE,
    "nextDueOn"         DATE,
    "testingCentre"     TEXT,
    "notes"             TEXT,
    "supersedesId"      TEXT,
    "recordedByUserId"  TEXT                 NOT NULL,
    "recordedAt"        TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleEmissionTest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleEmissionTest_certificate_order_check" CHECK ("certificateExpiresOn" IS NULL OR "issuedOn" IS NULL OR "certificateExpiresOn" >= "issuedOn"),
    CONSTRAINT "VehicleEmissionTest_next_due_order_check" CHECK ("nextDueOn" IS NULL OR "nextDueOn" >= "testedOn"),
    CONSTRAINT "VehicleEmissionTest_number_check" CHECK ("certificateNumber" IS NULL OR char_length(btrim("certificateNumber")) BETWEEN 1 AND 100),
    CONSTRAINT "VehicleEmissionTest_self_link_check" CHECK ("supersedesId" IS DISTINCT FROM "id")
);
CREATE INDEX "VehicleEmissionTest_vehicleId_testedOn_idx" ON "VehicleEmissionTest"("vehicleId", "testedOn");
CREATE INDEX "VehicleEmissionTest_vehicleId_certificateExpiresOn_idx" ON "VehicleEmissionTest"("vehicleId", "certificateExpiresOn");
CREATE INDEX "VehicleEmissionTest_vehicleId_nextDueOn_idx" ON "VehicleEmissionTest"("vehicleId", "nextDueOn");

-- ===========================================================================
-- 6. Revenue licences (append-only). Due dates are entered by an administrator. Renewal is a new row, never an update.
--    The renewal is recorded explicitly. Nothing marks a licence renewed automatically.
-- ===========================================================================
CREATE TABLE "VehicleRevenueLicence" (
    "id"               TEXT          NOT NULL,
    "vehicleId"        TEXT          NOT NULL,
    "licenceNumber"    TEXT,
    "issuedOn"         DATE,
    "renewedOn"        DATE,
    "dueOn"            DATE          NOT NULL,
    "notes"            TEXT,
    "renewsLicenceId"  TEXT,
    "supersedesId"     TEXT,
    "recordedByUserId" TEXT          NOT NULL,
    "recordedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleRevenueLicence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleRevenueLicence_due_order_check" CHECK ("issuedOn" IS NULL OR "dueOn" >= "issuedOn"),
    CONSTRAINT "VehicleRevenueLicence_renewed_check" CHECK ("renewedOn" IS NULL OR "issuedOn" IS NULL OR "renewedOn" >= "issuedOn"),
    CONSTRAINT "VehicleRevenueLicence_number_check" CHECK ("licenceNumber" IS NULL OR char_length(btrim("licenceNumber")) BETWEEN 1 AND 100),
    CONSTRAINT "VehicleRevenueLicence_self_link_check" CHECK ("renewsLicenceId" IS DISTINCT FROM "id" AND "supersedesId" IS DISTINCT FROM "id")
);
CREATE INDEX "VehicleRevenueLicence_vehicleId_dueOn_idx" ON "VehicleRevenueLicence"("vehicleId", "dueOn");
CREATE INDEX "VehicleRevenueLicence_renewsLicenceId_idx" ON "VehicleRevenueLicence"("renewsLicenceId");

-- ===========================================================================
-- 7. Service and inspection records (append-only). Completed history is never rewritten. A correction is a new row.
--    The schedule for the next service is entered by an administrator. No interval is assumed.
-- ===========================================================================
CREATE TABLE "VehicleServiceRecord" (
    "id"                  TEXT              NOT NULL,
    "vehicleId"           TEXT              NOT NULL,
    "category"            "ServiceCategory" NOT NULL,
    "serviceDate"         DATE              NOT NULL,
    "odometerKm"          INTEGER,
    "providerName"        TEXT,
    "workPerformed"       TEXT,
    "findings"            TEXT,
    "recommendations"     TEXT,
    "partsCost"           DECIMAL(10,2)     NOT NULL DEFAULT 0,
    "labourCost"          DECIMAL(10,2)     NOT NULL DEFAULT 0,
    "totalCost"           DECIMAL(10,2)     NOT NULL,
    "nextServiceDate"     DATE,
    "nextServiceOdometerKm" INTEGER,
    "notes"               TEXT,
    "supersedesId"        TEXT,
    "faultId"             TEXT,
    "recordedByUserId"    TEXT              NOT NULL,
    "recordedAt"          TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleServiceRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleServiceRecord_odometer_check" CHECK ("odometerKm" IS NULL OR "odometerKm" >= 0),
    CONSTRAINT "VehicleServiceRecord_next_odometer_check" CHECK ("nextServiceOdometerKm" IS NULL OR "nextServiceOdometerKm" >= 0),
    CONSTRAINT "VehicleServiceRecord_next_order_check" CHECK ("nextServiceDate" IS NULL OR "nextServiceDate" >= "serviceDate"),
    CONSTRAINT "VehicleServiceRecord_next_odometer_order_check" CHECK ("nextServiceOdometerKm" IS NULL OR "odometerKm" IS NULL OR "nextServiceOdometerKm" >= "odometerKm"),
    CONSTRAINT "VehicleServiceRecord_costs_check" CHECK ("partsCost" >= 0 AND "labourCost" >= 0 AND "totalCost" >= 0),
    CONSTRAINT "VehicleServiceRecord_total_check" CHECK ("totalCost" = "partsCost" + "labourCost"),
    CONSTRAINT "VehicleServiceRecord_self_link_check" CHECK ("supersedesId" IS DISTINCT FROM "id"),
    CONSTRAINT "VehicleServiceRecord_fault_link_check" CHECK ("faultId" IS NULL OR "category" = 'CORRECTIVE_SERVICE')
);
CREATE INDEX "VehicleServiceRecord_vehicleId_serviceDate_idx" ON "VehicleServiceRecord"("vehicleId", "serviceDate");
CREATE INDEX "VehicleServiceRecord_vehicleId_nextServiceDate_idx" ON "VehicleServiceRecord"("vehicleId", "nextServiceDate");
CREATE INDEX "VehicleServiceRecord_faultId_idx" ON "VehicleServiceRecord"("faultId");

-- Checklist results for one service record. One row per item per record. Rows are never changed.
CREATE TABLE "VehicleServiceChecklistItem" (
    "id"              TEXT              NOT NULL,
    "serviceRecordId" TEXT              NOT NULL,
    "item"            "ChecklistItem"   NOT NULL,
    "result"          "ChecklistResult" NOT NULL,
    "note"            TEXT,

    CONSTRAINT "VehicleServiceChecklistItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleServiceChecklistItem_serviceRecordId_item_key" UNIQUE ("serviceRecordId", "item")
);

-- ===========================================================================
-- 8. Faults and repairs. A fault's current state is updated in place; every change is also written to VehicleRepairEvent.
--    An open safety-critical fault (makes the vehicle unavailable, or is CRITICAL) gives an administrator warning only. It never blocks booking. See DESIGN.md section 7.
-- ===========================================================================
CREATE TABLE "VehicleFault" (
    "id"               TEXT           NOT NULL,
    "vehicleId"        TEXT           NOT NULL,
    "severity"         "FaultSeverity" NOT NULL,
    "description"      TEXT           NOT NULL,
    "makesUnavailable" BOOLEAN        NOT NULL,
    "status"           "RepairStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedAt"       TIMESTAMP(3)   NOT NULL,
    "reportedByUserId" TEXT           NOT NULL,
    "workshop"         TEXT,
    "diagnosis"        TEXT,
    "workPerformed"    TEXT,
    "repairCost"       DECIMAL(10,2),
    "completedAt"      TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "VehicleFault_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleFault_description_check" CHECK (char_length(btrim("description")) BETWEEN 1 AND 2000),
    CONSTRAINT "VehicleFault_cost_check" CHECK ("repairCost" IS NULL OR "repairCost" >= 0),
    CONSTRAINT "VehicleFault_completed_order_check" CHECK ("completedAt" IS NULL OR "completedAt" >= "reportedAt"),
    CONSTRAINT "VehicleFault_completed_status_check" CHECK (("status" = 'COMPLETED') = ("completedAt" IS NOT NULL))
);
ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_id_vehicleId_key" UNIQUE ("id", "vehicleId");
CREATE INDEX "VehicleFault_vehicleId_status_idx" ON "VehicleFault"("vehicleId", "status");
CREATE INDEX "VehicleFault_status_severity_idx" ON "VehicleFault"("status", "severity");

CREATE TABLE "VehicleRepairEvent" (
    "id"             TEXT           NOT NULL,
    "faultId"        TEXT           NOT NULL,
    "eventType"      TEXT           NOT NULL,
    "previousStatus" "RepairStatus",
    "newStatus"      "RepairStatus",
    "note"           TEXT,
    "amount"         DECIMAL(10,2),
    "actorUserId"    TEXT           NOT NULL,
    "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleRepairEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleRepairEvent_type_check" CHECK ("eventType" IN ('STATUS_CHANGED', 'NOTE_ADDED', 'COST_RECORDED', 'DOCUMENT_ADDED')),
    CONSTRAINT "VehicleRepairEvent_amount_check" CHECK ("amount" IS NULL OR "amount" >= 0)
);
CREATE INDEX "VehicleRepairEvent_faultId_createdAt_idx" ON "VehicleRepairEvent"("faultId", "createdAt");

-- ===========================================================================
-- 9. Maintenance documents (private). Metadata only. The file lives in private storage under a random key.
--    Soft delete only: deletedAt and deletedByUserId are set once. Nothing else changes after upload.
-- ===========================================================================
CREATE TABLE "VehicleMaintenanceDocument" (
    "id"                  TEXT                       NOT NULL,
    "vehicleId"           TEXT                       NOT NULL,
    "kind"                "MaintenanceDocumentKind"  NOT NULL,
    "insurancePolicyId"   TEXT,
    "emissionTestId"      TEXT,
    "revenueLicenceId"    TEXT,
    "serviceRecordId"     TEXT,
    "faultId"             TEXT,
    "replacesDocumentId"  TEXT,
    "storageKey"          TEXT                       NOT NULL,
    "originalFileName"    TEXT                       NOT NULL,
    "mimeType"            TEXT                       NOT NULL,
    "fileSizeBytes"       INTEGER                    NOT NULL,
    "sha256"              CHAR(64)                   NOT NULL,
    "uploadedByUserId"    TEXT                       NOT NULL,
    "uploadedAt"          TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"           TIMESTAMP(3),
    "deletedByUserId"     TEXT,
    "deletionReason"      TEXT,

    CONSTRAINT "VehicleMaintenanceDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleMaintenanceDocument_storageKey_key" UNIQUE ("storageKey"),
    CONSTRAINT "VehicleMaintenanceDocument_mime_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'application/pdf')),
    CONSTRAINT "VehicleMaintenanceDocument_size_check" CHECK ("fileSizeBytes" BETWEEN 1 AND 5242880),
    CONSTRAINT "VehicleMaintenanceDocument_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "VehicleMaintenanceDocument_name_check" CHECK (char_length(btrim("originalFileName")) BETWEEN 1 AND 200),
    CONSTRAINT "VehicleMaintenanceDocument_deleted_pair_check" CHECK (("deletedAt" IS NULL) = ("deletedByUserId" IS NULL)),
    -- Written so that a missing reason is refused: a CHECK that evaluates to NULL passes, so "IS NOT NULL" is explicit.
    CONSTRAINT "VehicleMaintenanceDocument_deleted_reason_check" CHECK ("deletedAt" IS NULL OR ("deletionReason" IS NOT NULL AND char_length(btrim("deletionReason")) BETWEEN 1 AND 1000)),
    CONSTRAINT "VehicleMaintenanceDocument_one_link_check" CHECK (
        (CASE WHEN "insurancePolicyId" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "emissionTestId" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "revenueLicenceId" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "serviceRecordId" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "faultId" IS NULL THEN 0 ELSE 1 END) <= 1
    ),
    CONSTRAINT "VehicleMaintenanceDocument_self_link_check" CHECK ("replacesDocumentId" IS DISTINCT FROM "id")
);
CREATE INDEX "VehicleMaintenanceDocument_vehicleId_kind_idx" ON "VehicleMaintenanceDocument"("vehicleId", "kind");
CREATE INDEX "VehicleMaintenanceDocument_deletedAt_idx" ON "VehicleMaintenanceDocument"("deletedAt") WHERE "deletedAt" IS NOT NULL;

-- ===========================================================================
-- 10. In-app reminders. One row per (vehicle, category, target record, due date, lead time). The unique key makes
--     generation idempotent: generating twice inserts nothing new. A renewal or new service creates a new target record,
--     and the old reminder is marked SUPERSEDED. Rows are never deleted.
-- ===========================================================================
CREATE TABLE "VehicleMaintenanceReminder" (
    "id"                 TEXT               NOT NULL,
    "vehicleId"          TEXT               NOT NULL,
    "category"           "ReminderCategory" NOT NULL,
    "targetRecordId"     TEXT               NOT NULL,
    "dueOn"              DATE               NOT NULL,
    "leadDays"           INTEGER            NOT NULL,
    "status"             "ReminderStatus"   NOT NULL DEFAULT 'OPEN',
    "createdAt"          TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt"     TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,

    CONSTRAINT "VehicleMaintenanceReminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleMaintenanceReminder_vehicleId_category_targetRecordI_key" UNIQUE ("vehicleId", "category", "targetRecordId", "dueOn", "leadDays"),
    CONSTRAINT "VehicleMaintenanceReminder_lead_check" CHECK ("leadDays" BETWEEN 1 AND 365),
    CONSTRAINT "VehicleMaintenanceReminder_ack_pair_check" CHECK (("acknowledgedAt" IS NULL) = ("acknowledgedByUserId" IS NULL))
);
CREATE INDEX "VehicleMaintenanceReminder_status_dueOn_idx" ON "VehicleMaintenanceReminder"("status", "dueOn");

-- Reminder settings: the lead times an administrator chooses per category. Empty by default: the application's own
-- defaults (30, 14, 7 days) apply until a change is made. Rows may be deleted by an administrator, and each change is audited.
CREATE TABLE "VehicleMaintenanceReminderSetting" (
    "category"         "ReminderCategory" NOT NULL,
    "leadDays"         INTEGER            NOT NULL,
    "updatedByUserId"  TEXT               NOT NULL,
    "updatedAt"        TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenanceReminderSetting_pkey" PRIMARY KEY ("category", "leadDays"),
    CONSTRAINT "VehicleMaintenanceReminderSetting_lead_check" CHECK ("leadDays" BETWEEN 1 AND 365)
);

-- ===========================================================================
-- 11. Maintenance audit (append-only). One row for every create, correction, renewal, decision, upload, soft delete and
--     reminder change. The summary holds field names and values that are not personal data. It never holds a file or a secret.
-- ===========================================================================
CREATE TABLE "VehicleMaintenanceAuditLog" (
    "id"           TEXT          NOT NULL,
    "vehicleId"    TEXT          NOT NULL,
    "entityType"   TEXT          NOT NULL,
    "entityId"     TEXT          NOT NULL,
    "action"       TEXT          NOT NULL,
    "reason"       TEXT,
    "summary"      JSONB,
    "actorUserId"  TEXT          NOT NULL,
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenanceAuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleMaintenanceAuditLog_entity_check" CHECK ("entityType" IN (
        'INSURANCE_POLICY', 'COMPLIANCE_DECISION', 'EMISSION_TEST', 'REVENUE_LICENCE', 'SERVICE_RECORD',
        'FAULT', 'REPAIR_EVENT', 'DOCUMENT', 'REMINDER', 'REMINDER_SETTING'
    ))
);
CREATE INDEX "VehicleMaintenanceAuditLog_vehicleId_createdAt_idx" ON "VehicleMaintenanceAuditLog"("vehicleId", "createdAt");
CREATE INDEX "VehicleMaintenanceAuditLog_actorUserId_createdAt_idx" ON "VehicleMaintenanceAuditLog"("actorUserId", "createdAt");

-- ===========================================================================
-- 12. Foreign keys. Added after every table exists, so the order of creation does not matter.
-- ===========================================================================
ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_renewsPolicyId_fkey"
    FOREIGN KEY ("renewsPolicyId") REFERENCES "VehicleInsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_supersedesId_fkey"
    FOREIGN KEY ("supersedesId") REFERENCES "VehicleInsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleComplianceDecision" ADD CONSTRAINT "VehicleComplianceDecision_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleComplianceDecision" ADD CONSTRAINT "VehicleComplianceDecision_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_supersedesId_fkey"
    FOREIGN KEY ("supersedesId") REFERENCES "VehicleEmissionTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_renewsLicenceId_fkey"
    FOREIGN KEY ("renewsLicenceId") REFERENCES "VehicleRevenueLicence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_supersedesId_fkey"
    FOREIGN KEY ("supersedesId") REFERENCES "VehicleRevenueLicence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_supersedesId_fkey"
    FOREIGN KEY ("supersedesId") REFERENCES "VehicleServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_faultId_vehicleId_fkey"
    FOREIGN KEY ("faultId", "vehicleId") REFERENCES "VehicleFault"("id", "vehicleId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceChecklistItem" ADD CONSTRAINT "VehicleServiceChecklistItem_serviceRecordId_fkey"
    FOREIGN KEY ("serviceRecordId") REFERENCES "VehicleServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_reportedByUserId_fkey"
    FOREIGN KEY ("reportedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRepairEvent" ADD CONSTRAINT "VehicleRepairEvent_faultId_fkey"
    FOREIGN KEY ("faultId") REFERENCES "VehicleFault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleRepairEvent" ADD CONSTRAINT "VehicleRepairEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_insurancePolicyId_fkey"
    FOREIGN KEY ("insurancePolicyId") REFERENCES "VehicleInsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_emissionTestId_fkey"
    FOREIGN KEY ("emissionTestId") REFERENCES "VehicleEmissionTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_revenueLicenceId_fkey"
    FOREIGN KEY ("revenueLicenceId") REFERENCES "VehicleRevenueLicence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_serviceRecordId_fkey"
    FOREIGN KEY ("serviceRecordId") REFERENCES "VehicleServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_faultId_fkey"
    FOREIGN KEY ("faultId") REFERENCES "VehicleFault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_replacesDocumentId_fkey"
    FOREIGN KEY ("replacesDocumentId") REFERENCES "VehicleMaintenanceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_deletedByUserId_fkey"
    FOREIGN KEY ("deletedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_acknowledgedByUserId_fkey"
    FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceReminderSetting" ADD CONSTRAINT "VehicleMaintenanceReminderSetting_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceAuditLog" ADD CONSTRAINT "VehicleMaintenanceAuditLog_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleMaintenanceAuditLog" ADD CONSTRAINT "VehicleMaintenanceAuditLog_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The checklist item belongs to its service record: a checklist row is written with its record and never moves.
-- (Foreign key above is RESTRICT, so a record with a checklist cannot be deleted. Records are never deleted anyway.)

-- ===========================================================================
-- 13. Triggers: append-only tables refuse UPDATE and DELETE.
-- ===========================================================================
CREATE TRIGGER "VehicleInsurancePolicy_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleInsurancePolicy"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleComplianceDecision_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleComplianceDecision"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleEmissionTest_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleEmissionTest"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleRevenueLicence_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleRevenueLicence"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleServiceRecord_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleServiceRecord"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleServiceChecklistItem_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleServiceChecklistItem"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleRepairEvent_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleRepairEvent"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();
CREATE TRIGGER "VehicleMaintenanceAuditLog_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleMaintenanceAuditLog"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_change"();

-- Mutable tables: delete is refused; updates are limited by a column-level guard (below).
CREATE TRIGGER "VehicleFault_no_delete"
    BEFORE DELETE ON "VehicleFault"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_delete"();
CREATE TRIGGER "VehicleMaintenanceDocument_no_delete"
    BEFORE DELETE ON "VehicleMaintenanceDocument"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_delete"();
CREATE TRIGGER "VehicleMaintenanceReminder_no_delete"
    BEFORE DELETE ON "VehicleMaintenanceReminder"
    FOR EACH ROW EXECUTE FUNCTION "riona_reject_maintenance_delete"();

-- Documents: only the soft-delete columns may change, and only once.
CREATE FUNCTION "riona_guard_maintenance_document"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."deletedAt" IS NOT NULL
       OR NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."vehicleId" IS DISTINCT FROM OLD."vehicleId"
       OR NEW."kind" IS DISTINCT FROM OLD."kind"
       OR NEW."insurancePolicyId" IS DISTINCT FROM OLD."insurancePolicyId"
       OR NEW."emissionTestId" IS DISTINCT FROM OLD."emissionTestId"
       OR NEW."revenueLicenceId" IS DISTINCT FROM OLD."revenueLicenceId"
       OR NEW."serviceRecordId" IS DISTINCT FROM OLD."serviceRecordId"
       OR NEW."faultId" IS DISTINCT FROM OLD."faultId"
       OR NEW."replacesDocumentId" IS DISTINCT FROM OLD."replacesDocumentId"
       OR NEW."storageKey" IS DISTINCT FROM OLD."storageKey"
       OR NEW."originalFileName" IS DISTINCT FROM OLD."originalFileName"
       OR NEW."mimeType" IS DISTINCT FROM OLD."mimeType"
       OR NEW."fileSizeBytes" IS DISTINCT FROM OLD."fileSizeBytes"
       OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
       OR NEW."uploadedByUserId" IS DISTINCT FROM OLD."uploadedByUserId"
       OR NEW."uploadedAt" IS DISTINCT FROM OLD."uploadedAt" THEN
        RAISE EXCEPTION 'A maintenance document cannot be changed except to mark it deleted, once' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "VehicleMaintenanceDocument_guard"
    BEFORE UPDATE ON "VehicleMaintenanceDocument"
    FOR EACH ROW EXECUTE FUNCTION "riona_guard_maintenance_document"();

-- Faults: the identity and the reporting facts never change. Only state, repair detail and cost may change.
CREATE FUNCTION "riona_guard_vehicle_fault"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."vehicleId" IS DISTINCT FROM OLD."vehicleId"
       OR NEW."reportedAt" IS DISTINCT FROM OLD."reportedAt"
       OR NEW."reportedByUserId" IS DISTINCT FROM OLD."reportedByUserId"
       OR NEW."description" IS DISTINCT FROM OLD."description"
       OR NEW."severity" IS DISTINCT FROM OLD."severity" THEN
        RAISE EXCEPTION 'The reported facts of a fault cannot be changed' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "VehicleFault_guard"
    BEFORE UPDATE ON "VehicleFault"
    FOR EACH ROW EXECUTE FUNCTION "riona_guard_vehicle_fault"();

-- Reminders: only the status and acknowledgement columns may change. The identity of the reminder never changes.
CREATE FUNCTION "riona_guard_maintenance_reminder"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."vehicleId" IS DISTINCT FROM OLD."vehicleId"
       OR NEW."category" IS DISTINCT FROM OLD."category"
       OR NEW."targetRecordId" IS DISTINCT FROM OLD."targetRecordId"
       OR NEW."dueOn" IS DISTINCT FROM OLD."dueOn"
       OR NEW."leadDays" IS DISTINCT FROM OLD."leadDays"
       OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
        RAISE EXCEPTION 'A reminder identity cannot be changed' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "VehicleMaintenanceReminder_guard"
    BEFORE UPDATE ON "VehicleMaintenanceReminder"
    FOR EACH ROW EXECUTE FUNCTION "riona_guard_maintenance_reminder"();
