-- Manual rollback for 20261016120000_vehicle_audit_log. Not run automatically.
-- Dropping the table removes the vehicle change history, so only run this if that history is not needed.
DROP TRIGGER IF EXISTS "VehicleAuditLog_append_only" ON "VehicleAuditLog";
DROP FUNCTION IF EXISTS "VehicleAuditLog_reject_change"();
DROP TABLE IF EXISTS "VehicleAuditLog";
DROP TYPE IF EXISTS "VehicleAuditAction";
