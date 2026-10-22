-- CreateTable
CREATE TABLE "SessionSlot" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionSlot_sortOrder_key" ON "SessionSlot"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSlot_startTime_key" ON "SessionSlot"("startTime");

-- AddCheck: a slot ends after it starts
ALTER TABLE "SessionSlot" ADD CONSTRAINT "SessionSlot_time_order_check" CHECK ("endTime" > "startTime");

-- Seed the four fixed session times: 8:00, 10:00, 12:00 and 2:00 (each two hours).
-- Admins can change these times and open or close a slot afterwards.
INSERT INTO "SessionSlot" ("id", "sortOrder", "startTime", "endTime", "isActive", "updatedAt") VALUES
    ('session-slot-1', 1, '08:00', '10:00', true, CURRENT_TIMESTAMP),
    ('session-slot-2', 2, '10:00', '12:00', true, CURRENT_TIMESTAMP),
    ('session-slot-3', 3, '12:00', '14:00', true, CURRENT_TIMESTAMP),
    ('session-slot-4', 4, '14:00', '16:00', true, CURRENT_TIMESTAMP);
