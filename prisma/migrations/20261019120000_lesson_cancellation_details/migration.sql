-- Cancellation details on each lesson. All three columns are nullable. Lessons cancelled before this migration
-- keep NULL, and they stay valid: nothing here changes or rejects an existing row.
ALTER TABLE "LessonSchedule" ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledByUserId" TEXT;

-- AddForeignKey. The actor's account is kept as NULL if it is ever removed, so the lesson record survives.
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma cannot express CHECK constraints, so this rule lives in the migration only.
-- When a reason is stored it must not be blank. A NULL reason (a historical cancellation) is still allowed.
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_cancellation_reason_check"
CHECK ("cancellationReason" IS NULL OR btrim("cancellationReason") <> '');
