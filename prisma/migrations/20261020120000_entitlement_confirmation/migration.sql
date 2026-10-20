-- Entitlement confirmation. A requirement's session count may now be NULL, meaning "allocation pending".
-- Existing rows all hold a count, so they are unchanged. The CHECK keeps any stored count within 1 to 500.
ALTER TABLE "EnrollmentTrainingRequirement" ALTER COLUMN "requiredSessions" DROP NOT NULL;

ALTER TABLE "EnrollmentTrainingRequirement" ADD CONSTRAINT "EnrollmentTrainingRequirement_requiredSessions_range_check"
CHECK ("requiredSessions" IS NULL OR ("requiredSessions" >= 1 AND "requiredSessions" <= 500));

-- One row for each confirmation or change of a requirement's count. The requirement is referenced by plain text,
-- not a foreign key, so the history survives any later change to the requirement row.
CREATE TABLE "EnrollmentRequirementChange" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "previousRequiredSessions" INTEGER,
    "newRequiredSessions" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentRequirementChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentRequirementChange_requirementId_changedAt_idx" ON "EnrollmentRequirementChange"("requirementId", "changedAt");

-- AddForeignKey
ALTER TABLE "EnrollmentRequirementChange" ADD CONSTRAINT "EnrollmentRequirementChange_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot express CHECK constraints, so these rules live in the migration only.
ALTER TABLE "EnrollmentRequirementChange" ADD CONSTRAINT "EnrollmentRequirementChange_count_check"
CHECK (
  "newRequiredSessions" >= 1 AND "newRequiredSessions" <= 500
  AND ("previousRequiredSessions" IS NULL OR ("previousRequiredSessions" >= 1 AND "previousRequiredSessions" <= 500))
);

ALTER TABLE "EnrollmentRequirementChange" ADD CONSTRAINT "EnrollmentRequirementChange_reason_check"
CHECK (btrim("reason") <> '' AND char_length("reason") <= 300);

-- Append-only: a confirmation record can never be changed or removed, even by an admin or a direct SQL session.
CREATE FUNCTION "EnrollmentRequirementChange_reject_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Entitlement confirmation records cannot be changed or deleted' USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER "EnrollmentRequirementChange_append_only"
    BEFORE UPDATE OR DELETE ON "EnrollmentRequirementChange"
    FOR EACH ROW EXECUTE FUNCTION "EnrollmentRequirementChange_reject_change"();
