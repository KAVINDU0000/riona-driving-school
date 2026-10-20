-- DRAFT ONLY. NOT RUN. Rollback for the revised DRAFT-migration.sql (proposed 20261022120000_vehicle_maintenance).
--
-- WHAT THIS DESTROYS
--   Every row in the twelve tables below is deleted with its table: insurance policies and renewals, compliance decisions
--   (not applicable, exceptions), emission tests, revenue licences, service records and checklists, faults and repair events,
--   maintenance document metadata, reminders and reminder settings, and the maintenance audit log.
--   The uploaded files on disk are NOT removed by this SQL. They need a separate, reviewed cleanup.
--   Nothing outside these objects is changed: no existing vehicle, user, registration, payment, package, lesson or booking row.
--
-- WHEN IT MAY BE RUN
--   Only while every table below is empty, or after a verified backup and the owner's written acceptance of the loss.
--   Check first (read-only). Every count must be 0, or the owner must accept the loss:
--     SELECT 'VehicleInsurancePolicy' AS t, COUNT(*) FROM "VehicleInsurancePolicy"
--     UNION ALL SELECT 'VehicleComplianceDecision', COUNT(*) FROM "VehicleComplianceDecision"
--     UNION ALL SELECT 'VehicleEmissionTest', COUNT(*) FROM "VehicleEmissionTest"
--     UNION ALL SELECT 'VehicleRevenueLicence', COUNT(*) FROM "VehicleRevenueLicence"
--     UNION ALL SELECT 'VehicleServiceRecord', COUNT(*) FROM "VehicleServiceRecord"
--     UNION ALL SELECT 'VehicleServiceChecklistItem', COUNT(*) FROM "VehicleServiceChecklistItem"
--     UNION ALL SELECT 'VehicleFault', COUNT(*) FROM "VehicleFault"
--     UNION ALL SELECT 'VehicleRepairEvent', COUNT(*) FROM "VehicleRepairEvent"
--     UNION ALL SELECT 'VehicleMaintenanceDocument', COUNT(*) FROM "VehicleMaintenanceDocument"
--     UNION ALL SELECT 'VehicleMaintenanceReminder', COUNT(*) FROM "VehicleMaintenanceReminder"
--     UNION ALL SELECT 'VehicleMaintenanceReminderSetting', COUNT(*) FROM "VehicleMaintenanceReminderSetting"
--     UNION ALL SELECT 'VehicleMaintenanceAuditLog', COUNT(*) FROM "VehicleMaintenanceAuditLog";
--   If any count is above 0 and the tables hold real records, STOP. Export the rows first, with a retention plan.
--
-- ORDER
--   Tables that hold foreign keys to other new tables go first. Documents point at policies, tests, licences, services and
--   faults. Checklist rows point at service records. Repair events point at faults. Self-referencing history tables are
--   dropped as whole tables, so their own links go with them. Functions and types go last, after the triggers that use them
--   are gone with their tables.

-- 1. Tables that point at other new tables
DROP TABLE IF EXISTS "VehicleMaintenanceDocument";
DROP TABLE IF EXISTS "VehicleServiceChecklistItem";
DROP TABLE IF EXISTS "VehicleRepairEvent";

-- 2. Tables that point only at Vehicle and User, or at tables already dropped
DROP TABLE IF EXISTS "VehicleMaintenanceReminder";
DROP TABLE IF EXISTS "VehicleMaintenanceReminderSetting";
DROP TABLE IF EXISTS "VehicleMaintenanceAuditLog";
-- The service record holds a composite foreign key to the fault, so it is dropped before the fault.
DROP TABLE IF EXISTS "VehicleServiceRecord";
DROP TABLE IF EXISTS "VehicleFault";
DROP TABLE IF EXISTS "VehicleRevenueLicence";
DROP TABLE IF EXISTS "VehicleEmissionTest";
DROP TABLE IF EXISTS "VehicleComplianceDecision";
DROP TABLE IF EXISTS "VehicleInsurancePolicy";

-- 3. Functions used by the triggers (the triggers were removed with their tables)
DROP FUNCTION IF EXISTS "riona_guard_maintenance_reminder"();
DROP FUNCTION IF EXISTS "riona_guard_vehicle_fault"();
DROP FUNCTION IF EXISTS "riona_guard_maintenance_document"();
DROP FUNCTION IF EXISTS "riona_reject_maintenance_delete"();
DROP FUNCTION IF EXISTS "riona_reject_maintenance_change"();

-- 4. Enumerations, last, once no table uses them
DROP TYPE IF EXISTS "ReminderStatus";
DROP TYPE IF EXISTS "ReminderCategory";
DROP TYPE IF EXISTS "MaintenanceDocumentKind";
DROP TYPE IF EXISTS "RepairStatus";
DROP TYPE IF EXISTS "FaultSeverity";
DROP TYPE IF EXISTS "ChecklistResult";
DROP TYPE IF EXISTS "ChecklistItem";
DROP TYPE IF EXISTS "ServiceCategory";
DROP TYPE IF EXISTS "EmissionTestResult";
DROP TYPE IF EXISTS "ComplianceDecisionKind";
DROP TYPE IF EXISTS "ComplianceCategory";
