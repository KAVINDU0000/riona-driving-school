-- CreateTable
CREATE TABLE "VehicleTypeCapacity" (
    "vehicleType" "VehicleType" NOT NULL,
    "seats" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTypeCapacity_pkey" PRIMARY KEY ("vehicleType"),
    CONSTRAINT "VehicleTypeCapacity_seats_check" CHECK ("seats" > 0)
);

-- Seed the students each vehicle type can take in one session. Admins can change these.
INSERT INTO "VehicleTypeCapacity" ("vehicleType", "seats", "updatedAt") VALUES
    ('CAR', 4, CURRENT_TIMESTAMP),
    ('VAN', 7, CURRENT_TIMESTAMP),
    ('MOTORCYCLE', 5, CURRENT_TIMESTAMP),
    ('THREE_WHEELER', 3, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "SessionGroup" (
    "id" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "instructorUserId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionGroup_time_order_check" CHECK ("endTime" > "startTime"),
    CONSTRAINT "SessionGroup_capacity_check" CHECK ("capacity" > 0)
);

-- One vehicle and one instructor can each run only one group in a given slot on a given date.
CREATE UNIQUE INDEX "SessionGroup_lessonDate_startTime_vehicleId_key" ON "SessionGroup"("lessonDate", "startTime", "vehicleId");
CREATE UNIQUE INDEX "SessionGroup_lessonDate_startTime_instructorUserId_key" ON "SessionGroup"("lessonDate", "startTime", "instructorUserId");

-- AddForeignKey
ALTER TABLE "SessionGroup" ADD CONSTRAINT "SessionGroup_vehicleId_vehicleType_fkey" FOREIGN KEY ("vehicleId", "vehicleType") REFERENCES "Vehicle"("id", "vehicleType") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionGroup" ADD CONSTRAINT "SessionGroup_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "InstructorProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: a lesson may belong to a shared session group
ALTER TABLE "LessonSchedule" ADD COLUMN "sessionGroupId" TEXT;
CREATE INDEX "LessonSchedule_sessionGroupId_idx" ON "LessonSchedule"("sessionGroupId");
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_sessionGroupId_fkey" FOREIGN KEY ("sessionGroupId") REFERENCES "SessionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The instructor and vehicle rules now apply to lessons outside a group. Lessons inside a group share one instructor and
-- one vehicle on purpose, so the group's unique indexes above keep them from double-booking.
-- The student rule is unchanged: a student still cannot have two lessons at the same time.
ALTER TABLE "LessonSchedule" DROP CONSTRAINT "LessonSchedule_instructor_no_overlap";
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_instructor_no_overlap"
EXCLUDE USING gist (
  "instructorUserId" WITH =,
  tsrange(("lessonDate" + "startTime")::timestamp, ("lessonDate" + "endTime")::timestamp, '[)') WITH &&
) WHERE ("status" <> 'CANCELLED' AND "sessionGroupId" IS NULL);

ALTER TABLE "LessonSchedule" DROP CONSTRAINT "LessonSchedule_vehicle_no_overlap";
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_vehicle_no_overlap"
EXCLUDE USING gist (
  "vehicleId" WITH =,
  tsrange(("lessonDate" + "startTime")::timestamp, ("lessonDate" + "endTime")::timestamp, '[)') WITH &&
) WHERE ("status" <> 'CANCELLED' AND "sessionGroupId" IS NULL);
