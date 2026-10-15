-- CreateEnum
CREATE TYPE "VehicleAuditAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "VehicleAuditLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "action" "VehicleAuditAction" NOT NULL,
    "previousStatus" "VehicleStatus",
    "newStatus" "VehicleStatus",
    "changes" JSONB,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleAuditLog_pkey" PRIMARY KEY ("id"),
    -- Each action carries exactly the status fields it needs.
    CONSTRAINT "VehicleAuditLog_action_shape_check" CHECK (
        ("action" = 'STATUS_CHANGED' AND "previousStatus" IS NOT NULL AND "newStatus" IS NOT NULL AND "previousStatus" <> "newStatus")
        OR ("action" = 'CREATED' AND "previousStatus" IS NULL AND "newStatus" IS NOT NULL)
        OR ("action" = 'UPDATED' AND "previousStatus" IS NULL AND "newStatus" IS NULL)
    ),
    CONSTRAINT "VehicleAuditLog_changes_object_check" CHECK ("changes" IS NULL OR jsonb_typeof("changes") = 'object')
);

-- CreateIndex
CREATE INDEX "VehicleAuditLog_vehicleId_createdAt_idx" ON "VehicleAuditLog"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleAuditLog_actorUserId_createdAt_idx" ON "VehicleAuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "VehicleAuditLog" ADD CONSTRAINT "VehicleAuditLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleAuditLog" ADD CONSTRAINT "VehicleAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only: an audit row can never be changed or removed, even by an admin or a direct SQL session.
CREATE FUNCTION "VehicleAuditLog_reject_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Vehicle audit records cannot be changed or deleted' USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER "VehicleAuditLog_append_only"
    BEFORE UPDATE OR DELETE ON "VehicleAuditLog"
    FOR EACH ROW EXECUTE FUNCTION "VehicleAuditLog_reject_change"();
