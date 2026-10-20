-- Vehicle maintenance: insurance, compliance, emission tests, revenue licences, service records and
-- checklists, faults and repairs, documents, reminders and the maintenance audit log.
-- The schema already defined these models but no migration created them. Generated from
-- prisma/schema.prisma (prisma migrate diff --from-empty) and limited to the maintenance objects. The
-- functions, CHECK constraints and triggers were copied from the team-testing branch, where the feature
-- already runs. Prisma cannot express them, so they live in this migration only.

-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('EMISSION_TEST', 'REVENUE_LICENCE');

CREATE TYPE "ComplianceDecisionKind" AS ENUM ('NOT_APPLICABLE', 'EXCEPTION_DOCUMENTED');

CREATE TYPE "EmissionTestResult" AS ENUM ('PASS', 'FAIL');

CREATE TYPE "ServiceCategory" AS ENUM ('ROUTINE_SERVICE', 'MECHANICAL_INSPECTION', 'CORRECTIVE_SERVICE');

CREATE TYPE "ChecklistItem" AS ENUM ('ENGINE', 'BRAKES', 'SUSPENSION', 'STEERING', 'TYRES', 'BATTERY', 'LIGHTS', 'LEAKS', 'ELECTRICAL');

CREATE TYPE "ChecklistResult" AS ENUM ('PASS', 'ATTENTION', 'FAIL', 'NOT_CHECKED');

CREATE TYPE "FaultSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "RepairStatus" AS ENUM ('REPORTED', 'DIAGNOSED', 'IN_REPAIR', 'COMPLETED', 'CANCELLED');

CREATE TYPE "MaintenanceDocumentKind" AS ENUM ('INSURANCE_POLICY', 'EMISSION_CERTIFICATE', 'REVENUE_LICENCE', 'SERVICE_INVOICE', 'INSPECTION_REPORT');

CREATE TYPE "ReminderCategory" AS ENUM ('INSURANCE', 'EMISSION_TEST', 'REVENUE_LICENCE', 'SERVICE');

CREATE TYPE "ReminderStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "VehicleInsurancePolicy" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "insurer" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "coverage" TEXT NOT NULL,
    "coverageDetails" TEXT,
    "startsOn" DATE NOT NULL,
    "expiresOn" DATE NOT NULL,
    "premium" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "renewsPolicyId" TEXT,
    "supersedesId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleInsurancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleComplianceDecision" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "ComplianceCategory" NOT NULL,
    "decision" "ComplianceDecisionKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleComplianceDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleEmissionTest" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "testedOn" DATE NOT NULL,
    "result" "EmissionTestResult",
    "certificateNumber" TEXT,
    "issuedOn" DATE,
    "certificateExpiresOn" DATE,
    "nextDueOn" DATE,
    "testingCentre" TEXT,
    "notes" TEXT,
    "supersedesId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleEmissionTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleRevenueLicence" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "licenceNumber" TEXT,
    "issuedOn" DATE,
    "renewedOn" DATE,
    "dueOn" DATE NOT NULL,
    "notes" TEXT,
    "renewsLicenceId" TEXT,
    "supersedesId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleRevenueLicence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleServiceRecord" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "serviceDate" DATE NOT NULL,
    "odometerKm" INTEGER,
    "providerName" TEXT,
    "workPerformed" TEXT,
    "findings" TEXT,
    "recommendations" TEXT,
    "partsCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "nextServiceDate" DATE,
    "nextServiceOdometerKm" INTEGER,
    "notes" TEXT,
    "supersedesId" TEXT,
    "faultId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleServiceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleServiceChecklistItem" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "item" "ChecklistItem" NOT NULL,
    "result" "ChecklistResult" NOT NULL,
    "note" TEXT,

    CONSTRAINT "VehicleServiceChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleFault" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "severity" "FaultSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "makesUnavailable" BOOLEAN NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "reportedByUserId" TEXT NOT NULL,
    "workshop" TEXT,
    "diagnosis" TEXT,
    "workPerformed" TEXT,
    "repairCost" DECIMAL(10,2),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleFault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleRepairEvent" (
    "id" TEXT NOT NULL,
    "faultId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "previousStatus" "RepairStatus",
    "newStatus" "RepairStatus",
    "note" TEXT,
    "amount" DECIMAL(10,2),
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleRepairEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleMaintenanceDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" "MaintenanceDocumentKind" NOT NULL,
    "insurancePolicyId" TEXT,
    "emissionTestId" TEXT,
    "revenueLicenceId" TEXT,
    "serviceRecordId" TEXT,
    "faultId" TEXT,
    "replacesDocumentId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "deletionReason" TEXT,

    CONSTRAINT "VehicleMaintenanceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleMaintenanceReminder" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "ReminderCategory" NOT NULL,
    "targetRecordId" TEXT NOT NULL,
    "dueOn" DATE NOT NULL,
    "leadDays" INTEGER NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,

    CONSTRAINT "VehicleMaintenanceReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleMaintenanceReminderSetting" (
    "category" "ReminderCategory" NOT NULL,
    "leadDays" INTEGER NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenanceReminderSetting_pkey" PRIMARY KEY ("category","leadDays")
);

CREATE TABLE "VehicleMaintenanceAuditLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "summary" JSONB,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenanceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Five unique keys below are UNIQUE constraints rather than unique indexes, unlike this repository's other
-- migrations. They match the team-testing branch, where the feature was first created, so a fresh database ends
-- up with the same object types and names. Each constraint creates a unique index with the same name.
CREATE INDEX "VehicleInsurancePolicy_vehicleId_expiresOn_idx" ON "VehicleInsurancePolicy"("vehicleId", "expiresOn");

CREATE INDEX "VehicleInsurancePolicy_renewsPolicyId_idx" ON "VehicleInsurancePolicy"("renewsPolicyId");

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_vehicleId_policyNumber_startsOn_key" UNIQUE ("vehicleId", "policyNumber", "startsOn");

CREATE INDEX "VehicleComplianceDecision_vehicleId_category_decidedAt_idx" ON "VehicleComplianceDecision"("vehicleId", "category", "decidedAt");

CREATE INDEX "VehicleEmissionTest_vehicleId_testedOn_idx" ON "VehicleEmissionTest"("vehicleId", "testedOn");

CREATE INDEX "VehicleEmissionTest_vehicleId_certificateExpiresOn_idx" ON "VehicleEmissionTest"("vehicleId", "certificateExpiresOn");

CREATE INDEX "VehicleEmissionTest_vehicleId_nextDueOn_idx" ON "VehicleEmissionTest"("vehicleId", "nextDueOn");

CREATE INDEX "VehicleRevenueLicence_vehicleId_dueOn_idx" ON "VehicleRevenueLicence"("vehicleId", "dueOn");

CREATE INDEX "VehicleRevenueLicence_renewsLicenceId_idx" ON "VehicleRevenueLicence"("renewsLicenceId");

CREATE INDEX "VehicleServiceRecord_vehicleId_serviceDate_idx" ON "VehicleServiceRecord"("vehicleId", "serviceDate");

CREATE INDEX "VehicleServiceRecord_vehicleId_nextServiceDate_idx" ON "VehicleServiceRecord"("vehicleId", "nextServiceDate");

CREATE INDEX "VehicleServiceRecord_faultId_idx" ON "VehicleServiceRecord"("faultId");

ALTER TABLE "VehicleServiceChecklistItem" ADD CONSTRAINT "VehicleServiceChecklistItem_serviceRecordId_item_key" UNIQUE ("serviceRecordId", "item");

CREATE INDEX "VehicleFault_vehicleId_status_idx" ON "VehicleFault"("vehicleId", "status");

CREATE INDEX "VehicleFault_status_severity_idx" ON "VehicleFault"("status", "severity");

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_id_vehicleId_key" UNIQUE ("id", "vehicleId");

CREATE INDEX "VehicleRepairEvent_faultId_createdAt_idx" ON "VehicleRepairEvent"("faultId", "createdAt");

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_storageKey_key" UNIQUE ("storageKey");

CREATE INDEX "VehicleMaintenanceDocument_vehicleId_kind_idx" ON "VehicleMaintenanceDocument"("vehicleId", "kind");

CREATE INDEX "VehicleMaintenanceReminder_status_dueOn_idx" ON "VehicleMaintenanceReminder"("status", "dueOn");

ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_vehicleId_category_targetRecordI_key" UNIQUE ("vehicleId", "category", "targetRecordId", "dueOn", "leadDays");

CREATE INDEX "VehicleMaintenanceAuditLog_vehicleId_createdAt_idx" ON "VehicleMaintenanceAuditLog"("vehicleId", "createdAt");

CREATE INDEX "VehicleMaintenanceAuditLog_actorUserId_createdAt_idx" ON "VehicleMaintenanceAuditLog"("actorUserId", "createdAt");

-- Indexes on team-testing that Prisma does not generate
CREATE INDEX "VehicleMaintenanceDocument_deletedAt_idx" ON public."VehicleMaintenanceDocument" USING btree ("deletedAt") WHERE ("deletedAt" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_renewsPolicyId_fkey" FOREIGN KEY ("renewsPolicyId") REFERENCES "VehicleInsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "VehicleInsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleComplianceDecision" ADD CONSTRAINT "VehicleComplianceDecision_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleComplianceDecision" ADD CONSTRAINT "VehicleComplianceDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "VehicleEmissionTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_renewsLicenceId_fkey" FOREIGN KEY ("renewsLicenceId") REFERENCES "VehicleRevenueLicence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "VehicleRevenueLicence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "VehicleServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_faultId_vehicleId_fkey" FOREIGN KEY ("faultId", "vehicleId") REFERENCES "VehicleFault"("id", "vehicleId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleServiceChecklistItem" ADD CONSTRAINT "VehicleServiceChecklistItem_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "VehicleServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRepairEvent" ADD CONSTRAINT "VehicleRepairEvent_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "VehicleFault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleRepairEvent" ADD CONSTRAINT "VehicleRepairEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "VehicleInsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_emissionTestId_fkey" FOREIGN KEY ("emissionTestId") REFERENCES "VehicleEmissionTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_revenueLicenceId_fkey" FOREIGN KEY ("revenueLicenceId") REFERENCES "VehicleRevenueLicence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "VehicleServiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "VehicleFault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_replacesDocumentId_fkey" FOREIGN KEY ("replacesDocumentId") REFERENCES "VehicleMaintenanceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceReminderSetting" ADD CONSTRAINT "VehicleMaintenanceReminderSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceAuditLog" ADD CONSTRAINT "VehicleMaintenanceAuditLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleMaintenanceAuditLog" ADD CONSTRAINT "VehicleMaintenanceAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Protective functions
CREATE OR REPLACE FUNCTION public.riona_reject_maintenance_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'Vehicle maintenance history cannot be changed or deleted' USING ERRCODE = 'check_violation';
END;
$function$;

CREATE OR REPLACE FUNCTION public.riona_guard_vehicle_fault()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.riona_reject_maintenance_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'Vehicle maintenance records cannot be deleted' USING ERRCODE = 'check_violation';
END;
$function$;

CREATE OR REPLACE FUNCTION public.riona_guard_maintenance_document()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.riona_guard_maintenance_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

-- CHECK constraints
ALTER TABLE "VehicleComplianceDecision" ADD CONSTRAINT "VehicleComplianceDecision_reason_check" CHECK (((char_length(btrim(reason)) >= 1) AND (char_length(btrim(reason)) <= 1000)));

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_certificate_order_check" CHECK ((("certificateExpiresOn" IS NULL) OR ("issuedOn" IS NULL) OR ("certificateExpiresOn" >= "issuedOn")));

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_next_due_order_check" CHECK ((("nextDueOn" IS NULL) OR ("nextDueOn" >= "testedOn")));

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_number_check" CHECK ((("certificateNumber" IS NULL) OR ((char_length(btrim("certificateNumber")) >= 1) AND (char_length(btrim("certificateNumber")) <= 100))));

ALTER TABLE "VehicleEmissionTest" ADD CONSTRAINT "VehicleEmissionTest_self_link_check" CHECK (("supersedesId" IS DISTINCT FROM id));

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_completed_order_check" CHECK ((("completedAt" IS NULL) OR ("completedAt" >= "reportedAt")));

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_completed_status_check" CHECK (((status = 'COMPLETED'::"RepairStatus") = ("completedAt" IS NOT NULL)));

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_cost_check" CHECK ((("repairCost" IS NULL) OR ("repairCost" >= (0)::numeric)));

ALTER TABLE "VehicleFault" ADD CONSTRAINT "VehicleFault_description_check" CHECK (((char_length(btrim(description)) >= 1) AND (char_length(btrim(description)) <= 2000)));

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_dates_check" CHECK (("expiresOn" > "startsOn"));

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_insurer_check" CHECK (((char_length(btrim(insurer)) >= 1) AND (char_length(btrim(insurer)) <= 200)));

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_number_check" CHECK (((char_length(btrim("policyNumber")) >= 1) AND (char_length(btrim("policyNumber")) <= 100)));

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_premium_check" CHECK ((premium >= (0)::numeric));

ALTER TABLE "VehicleInsurancePolicy" ADD CONSTRAINT "VehicleInsurancePolicy_self_link_check" CHECK ((("renewsPolicyId" IS DISTINCT FROM id) AND ("supersedesId" IS DISTINCT FROM id)));

ALTER TABLE "VehicleMaintenanceAuditLog" ADD CONSTRAINT "VehicleMaintenanceAuditLog_entity_check" CHECK (("entityType" = ANY (ARRAY['INSURANCE_POLICY'::text, 'COMPLIANCE_DECISION'::text, 'EMISSION_TEST'::text, 'REVENUE_LICENCE'::text, 'SERVICE_RECORD'::text, 'FAULT'::text, 'REPAIR_EVENT'::text, 'DOCUMENT'::text, 'REMINDER'::text, 'REMINDER_SETTING'::text])));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_deleted_pair_check" CHECK ((("deletedAt" IS NULL) = ("deletedByUserId" IS NULL)));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_deleted_reason_check" CHECK ((("deletedAt" IS NULL) OR (("deletionReason" IS NOT NULL) AND ((char_length(btrim("deletionReason")) >= 1) AND (char_length(btrim("deletionReason")) <= 1000)))));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_mime_check" CHECK (("mimeType" = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'application/pdf'::text])));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_name_check" CHECK (((char_length(btrim("originalFileName")) >= 1) AND (char_length(btrim("originalFileName")) <= 200)));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_one_link_check" CHECK ((((((
CASE
    WHEN ("insurancePolicyId" IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN ("emissionTestId" IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN ("revenueLicenceId" IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN ("serviceRecordId" IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN ("faultId" IS NULL) THEN 0
    ELSE 1
END) <= 1));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_self_link_check" CHECK (("replacesDocumentId" IS DISTINCT FROM id));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_sha256_check" CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text));

ALTER TABLE "VehicleMaintenanceDocument" ADD CONSTRAINT "VehicleMaintenanceDocument_size_check" CHECK ((("fileSizeBytes" >= 1) AND ("fileSizeBytes" <= 5242880)));

ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_ack_pair_check" CHECK ((("acknowledgedAt" IS NULL) = ("acknowledgedByUserId" IS NULL)));

ALTER TABLE "VehicleMaintenanceReminder" ADD CONSTRAINT "VehicleMaintenanceReminder_lead_check" CHECK ((("leadDays" >= 1) AND ("leadDays" <= 365)));

ALTER TABLE "VehicleMaintenanceReminderSetting" ADD CONSTRAINT "VehicleMaintenanceReminderSetting_lead_check" CHECK ((("leadDays" >= 1) AND ("leadDays" <= 365)));

ALTER TABLE "VehicleRepairEvent" ADD CONSTRAINT "VehicleRepairEvent_amount_check" CHECK (((amount IS NULL) OR (amount >= (0)::numeric)));

ALTER TABLE "VehicleRepairEvent" ADD CONSTRAINT "VehicleRepairEvent_type_check" CHECK (("eventType" = ANY (ARRAY['STATUS_CHANGED'::text, 'NOTE_ADDED'::text, 'COST_RECORDED'::text, 'DOCUMENT_ADDED'::text])));

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_due_order_check" CHECK ((("issuedOn" IS NULL) OR ("dueOn" >= "issuedOn")));

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_number_check" CHECK ((("licenceNumber" IS NULL) OR ((char_length(btrim("licenceNumber")) >= 1) AND (char_length(btrim("licenceNumber")) <= 100))));

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_renewed_check" CHECK ((("renewedOn" IS NULL) OR ("issuedOn" IS NULL) OR ("renewedOn" >= "issuedOn")));

ALTER TABLE "VehicleRevenueLicence" ADD CONSTRAINT "VehicleRevenueLicence_self_link_check" CHECK ((("renewsLicenceId" IS DISTINCT FROM id) AND ("supersedesId" IS DISTINCT FROM id)));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_costs_check" CHECK ((("partsCost" >= (0)::numeric) AND ("labourCost" >= (0)::numeric) AND ("totalCost" >= (0)::numeric)));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_fault_link_check" CHECK ((("faultId" IS NULL) OR (category = 'CORRECTIVE_SERVICE'::"ServiceCategory")));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_next_odometer_check" CHECK ((("nextServiceOdometerKm" IS NULL) OR ("nextServiceOdometerKm" >= 0)));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_next_odometer_order_check" CHECK ((("nextServiceOdometerKm" IS NULL) OR ("odometerKm" IS NULL) OR ("nextServiceOdometerKm" >= "odometerKm")));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_next_order_check" CHECK ((("nextServiceDate" IS NULL) OR ("nextServiceDate" >= "serviceDate")));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_odometer_check" CHECK ((("odometerKm" IS NULL) OR ("odometerKm" >= 0)));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_self_link_check" CHECK (("supersedesId" IS DISTINCT FROM id));

ALTER TABLE "VehicleServiceRecord" ADD CONSTRAINT "VehicleServiceRecord_total_check" CHECK (("totalCost" = ("partsCost" + "labourCost")));

-- Triggers
CREATE TRIGGER "VehicleComplianceDecision_append_only" BEFORE DELETE OR UPDATE ON public."VehicleComplianceDecision" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleEmissionTest_append_only" BEFORE DELETE OR UPDATE ON public."VehicleEmissionTest" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleFault_guard" BEFORE UPDATE ON public."VehicleFault" FOR EACH ROW EXECUTE FUNCTION riona_guard_vehicle_fault();

CREATE TRIGGER "VehicleFault_no_delete" BEFORE DELETE ON public."VehicleFault" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_delete();

CREATE TRIGGER "VehicleInsurancePolicy_append_only" BEFORE DELETE OR UPDATE ON public."VehicleInsurancePolicy" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleMaintenanceAuditLog_append_only" BEFORE DELETE OR UPDATE ON public."VehicleMaintenanceAuditLog" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleMaintenanceDocument_guard" BEFORE UPDATE ON public."VehicleMaintenanceDocument" FOR EACH ROW EXECUTE FUNCTION riona_guard_maintenance_document();

CREATE TRIGGER "VehicleMaintenanceDocument_no_delete" BEFORE DELETE ON public."VehicleMaintenanceDocument" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_delete();

CREATE TRIGGER "VehicleMaintenanceReminder_guard" BEFORE UPDATE ON public."VehicleMaintenanceReminder" FOR EACH ROW EXECUTE FUNCTION riona_guard_maintenance_reminder();

CREATE TRIGGER "VehicleMaintenanceReminder_no_delete" BEFORE DELETE ON public."VehicleMaintenanceReminder" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_delete();

CREATE TRIGGER "VehicleRepairEvent_append_only" BEFORE DELETE OR UPDATE ON public."VehicleRepairEvent" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleRevenueLicence_append_only" BEFORE DELETE OR UPDATE ON public."VehicleRevenueLicence" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleServiceChecklistItem_append_only" BEFORE DELETE OR UPDATE ON public."VehicleServiceChecklistItem" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();

CREATE TRIGGER "VehicleServiceRecord_append_only" BEFORE DELETE OR UPDATE ON public."VehicleServiceRecord" FOR EACH ROW EXECUTE FUNCTION riona_reject_maintenance_change();
