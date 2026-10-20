-- Session counts chosen at registration (Regular fixed at 15 per vehicle; Trial 1 to 5 per vehicle, chosen by the applicant).
-- Additive only: creates one new table. It changes no existing row, no price and no enrollment. Existing applications
-- have no rows here, so they keep using the package's configured rows at approval, exactly as before.

-- CreateTable
CREATE TABLE "RegistrationSessionSelection" (
    "id" TEXT NOT NULL,
    "registrationRequestId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "requiredSessions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationSessionSelection_pkey" PRIMARY KEY ("id")
);

-- Prisma cannot express CHECK constraints, so this rule lives in the migration only.
-- 500 is the technical limit used elsewhere; the Trial range (1 to 5) is enforced by the application's session rules.
ALTER TABLE "RegistrationSessionSelection" ADD CONSTRAINT "RegistrationSessionSelection_requiredSessions_range_check"
CHECK ("requiredSessions" >= 1 AND "requiredSessions" <= 500);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationSessionSelection_unique" ON "RegistrationSessionSelection"("registrationRequestId", "vehicleType", "trainingType");

-- AddForeignKey
ALTER TABLE "RegistrationSessionSelection" ADD CONSTRAINT "RegistrationSessionSelection_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "RegistrationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
