-- Package display order. Existing rows get 0 here, so this migration changes no existing data. The school's
-- order is set by the separate, reviewed step in prisma/data/package-sort-order.sql.
ALTER TABLE "TrainingPackage" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- One row for each price change made from the admin pricing page. Prices stored on applications, enrollments
-- and payments are separate snapshot columns, so they are never changed by this table.
CREATE TABLE "TrainingPackagePriceChange" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "previousPrice" DECIMAL(10,2) NOT NULL,
    "newPrice" DECIMAL(10,2) NOT NULL,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPackagePriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingPackagePriceChange_packageId_changedAt_idx" ON "TrainingPackagePriceChange"("packageId", "changedAt");

-- AddForeignKey
ALTER TABLE "TrainingPackagePriceChange" ADD CONSTRAINT "TrainingPackagePriceChange_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TrainingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPackagePriceChange" ADD CONSTRAINT "TrainingPackagePriceChange_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma cannot express CHECK constraints, so these rules live in the migration only.
-- A price can never be negative.
ALTER TABLE "TrainingPackage" ADD CONSTRAINT "TrainingPackage_price_nonnegative_check" CHECK ("price" >= 0);

-- A per-session (DAILY) package must say how long one session lasts.
ALTER TABLE "TrainingPackage" ADD CONSTRAINT "TrainingPackage_daily_session_length_check"
CHECK ("packageType" <> 'DAILY' OR "sessionDurationMinutes" IS NOT NULL);
