-- Rollback for migration 20261017120000_package_sort_and_price_history.
-- NOT run automatically. Prisma has no down migrations. Run by hand, in one transaction, only when a rollback
-- has been approved. It DROPS the price-change history and the sort order. Check the history first:
--   SELECT COUNT(*) FROM "TrainingPackagePriceChange";
-- Dropping the table removes every recorded price change permanently.
BEGIN;
ALTER TABLE "TrainingPackage" DROP CONSTRAINT IF EXISTS "TrainingPackage_daily_session_length_check";
ALTER TABLE "TrainingPackage" DROP CONSTRAINT IF EXISTS "TrainingPackage_price_nonnegative_check";
DROP TABLE IF EXISTS "TrainingPackagePriceChange";
ALTER TABLE "TrainingPackage" DROP COLUMN IF EXISTS "sortOrder";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261017120000_package_sort_and_price_history';
COMMIT;
