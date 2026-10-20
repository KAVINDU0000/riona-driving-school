-- Manual rollback for 20261020120000_entitlement_confirmation. Not run automatically.
-- Refuses while any requirement is still pending (NULL), because a NOT NULL restore would fail on those rows.
-- Dropping the history table also deletes every recorded confirmation and change, so run it only after deciding to lose them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "EnrollmentTrainingRequirement" WHERE "requiredSessions" IS NULL) THEN
    RAISE EXCEPTION 'null requiredSessions rows exist; confirm or remove them before rolling back';
  END IF;
END $$;

DROP TABLE IF EXISTS "EnrollmentRequirementChange";
DROP FUNCTION IF EXISTS "EnrollmentRequirementChange_reject_change"();

ALTER TABLE "EnrollmentTrainingRequirement" DROP CONSTRAINT IF EXISTS "EnrollmentTrainingRequirement_requiredSessions_range_check";
ALTER TABLE "EnrollmentTrainingRequirement" ALTER COLUMN "requiredSessions" SET NOT NULL;
