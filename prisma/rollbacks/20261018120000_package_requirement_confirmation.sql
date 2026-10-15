-- Rollback for migration 20261018120000_package_requirement_confirmation.
-- NOT run automatically. Run by hand, in one transaction, only when a rollback is approved. It DROPS the requirement
-- change history and the confirmation fields. Check first:
--   SELECT COUNT(*) FROM "TrainingPackageItemChange";
--   SELECT COUNT(*) FROM "TrainingPackage" WHERE "requirementsConfirmedAt" IS NOT NULL;
BEGIN;
ALTER TABLE "TrainingPackageItem" DROP CONSTRAINT IF EXISTS "TrainingPackageItem_requiredSessions_range_check";
DROP TABLE IF EXISTS "TrainingPackageItemChange";
ALTER TABLE "TrainingPackage" DROP CONSTRAINT IF EXISTS "TrainingPackage_requirementsConfirmedByUserId_fkey";
ALTER TABLE "TrainingPackage" DROP COLUMN IF EXISTS "requirementsConfirmedByUserId";
ALTER TABLE "TrainingPackage" DROP COLUMN IF EXISTS "requirementsConfirmedAt";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261018120000_package_requirement_confirmation';
COMMIT;
