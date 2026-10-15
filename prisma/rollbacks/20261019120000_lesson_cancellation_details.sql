-- Manual rollback for 20261019120000_lesson_cancellation_details. Not run automatically.
-- Removing these columns deletes any stored cancellation reasons, so run it only after deciding to lose them.
ALTER TABLE "LessonSchedule" DROP CONSTRAINT IF EXISTS "LessonSchedule_cancellation_reason_check";
ALTER TABLE "LessonSchedule" DROP CONSTRAINT IF EXISTS "LessonSchedule_cancelledByUserId_fkey";
ALTER TABLE "LessonSchedule" DROP COLUMN IF EXISTS "cancelledByUserId",
DROP COLUMN IF EXISTS "cancelledAt",
DROP COLUMN IF EXISTS "cancellationReason";
