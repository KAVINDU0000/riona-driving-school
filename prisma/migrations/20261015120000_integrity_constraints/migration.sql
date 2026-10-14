-- Integrity rules that the earlier migration did not enforce. Each rule is an invariant that holds
-- regardless of business policy. Policy questions (allowed lesson durations, duplicate applications,
-- rejection rules, attendance timing) are deliberately NOT encoded here.
--
-- Prisma cannot express CHECK constraints or triggers, so they live in this migration only.

-- ----------------------------------------------------------------------------
-- Payment: a payment belongs to exactly one parent, a registration request OR an enrollment.
-- ----------------------------------------------------------------------------
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_exactly_one_parent_check"
CHECK (("registrationRequestId" IS NULL) <> ("enrollmentId" IS NULL));

-- A payment amount must be positive.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive_check"
CHECK ("amount" > 0);

-- An approved payment must record who approved it and when. Pending and rejected payments may
-- have a review record, but an approved one must have it. Approval is never implied by submission.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_approved_has_review_check"
CHECK ("status" <> 'APPROVED' OR ("reviewedByUserId" IS NOT NULL AND "lastReviewedAt" IS NOT NULL));

-- ----------------------------------------------------------------------------
-- Enrollment: money fields cannot be negative.
-- ----------------------------------------------------------------------------
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_prices_non_negative_check"
CHECK ("agreedPrice" >= 0 AND "finalFee" >= 0);

-- ----------------------------------------------------------------------------
-- RegistrationRequest: status and the approval fields must agree.
--   PENDING   -> not reviewed, no student account
--   APPROVED  -> reviewed and linked to exactly the student account created for it
--   REJECTED  -> reviewed, and never linked to a student account
-- ----------------------------------------------------------------------------
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_status_consistency_check"
CHECK (
  ("status" = 'PENDING' AND "reviewedAt" IS NULL AND "reviewedByUserId" IS NULL AND "approvedStudentUserId" IS NULL)
  OR
  ("status" = 'APPROVED' AND "reviewedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL AND "approvedStudentUserId" IS NOT NULL)
  OR
  ("status" = 'REJECTED' AND "reviewedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL AND "approvedStudentUserId" IS NULL)
);

-- ----------------------------------------------------------------------------
-- LessonFeedback: the feedback author must be the instructor assigned to that lesson.
-- A trigger is used instead of a composite foreign key so the existing lesson relation stays unchanged.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "riona_check_feedback_instructor"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "LessonSchedule" l
    WHERE l.id = NEW."lessonScheduleId" AND l."instructorUserId" = NEW."instructorUserId"
  ) THEN
    RAISE EXCEPTION 'Feedback must be written by the instructor assigned to the lesson' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "LessonFeedback_instructor_check"
BEFORE INSERT OR UPDATE ON "LessonFeedback"
FOR EACH ROW EXECUTE FUNCTION "riona_check_feedback_instructor"();
