-- Session requirement confirmation. Both columns are nullable, so every existing package starts unconfirmed.
-- This migration populates no requirement counts. The school enters and confirms them through the admin portal.
ALTER TABLE "TrainingPackage" ADD COLUMN "requirementsConfirmedAt" TIMESTAMP(3),
ADD COLUMN "requirementsConfirmedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "TrainingPackage" ADD CONSTRAINT "TrainingPackage_requirementsConfirmedByUserId_fkey" FOREIGN KEY ("requirementsConfirmedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- One row for each change to a package's session requirements. The item ID is plain text, not a foreign key,
-- so a removed requirement row still appears in the history.
CREATE TABLE "TrainingPackageItemChange" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageItemId" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "previousRequiredSessions" INTEGER,
    "newRequiredSessions" INTEGER,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPackageItemChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingPackageItemChange_packageId_changedAt_idx" ON "TrainingPackageItemChange"("packageId", "changedAt");

-- AddForeignKey
ALTER TABLE "TrainingPackageItemChange" ADD CONSTRAINT "TrainingPackageItemChange_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TrainingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPackageItemChange" ADD CONSTRAINT "TrainingPackageItemChange_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma cannot express CHECK constraints, so these rules live in the migration only.
-- 500 is a technical validation limit chosen for this system. It is not a school-defined requirement.
ALTER TABLE "TrainingPackageItem" ADD CONSTRAINT "TrainingPackageItem_requiredSessions_range_check"
CHECK ("requiredSessions" IS NULL OR ("requiredSessions" >= 1 AND "requiredSessions" <= 500));

ALTER TABLE "TrainingPackageItemChange" ADD CONSTRAINT "TrainingPackageItemChange_session_range_check"
CHECK (
  ("previousRequiredSessions" IS NULL OR ("previousRequiredSessions" >= 1 AND "previousRequiredSessions" <= 500))
  AND ("newRequiredSessions" IS NULL OR ("newRequiredSessions" >= 1 AND "newRequiredSessions" <= 500))
);
