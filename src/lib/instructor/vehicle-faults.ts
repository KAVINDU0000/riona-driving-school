import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { parseDateOnly, schoolNow } from "@/lib/student/time";
import { createFault } from "@/lib/vehicles/maintenance-data";
import { parseFaultInput } from "@/lib/vehicles/maintenance-input";

/** An instructor may report a fault on a vehicle used in one of their lessons within this many days, or in a future lesson. */
export const FAULT_REPORT_LOOKBACK_DAYS = 14;

/**
 * Files a fault report for a vehicle on the signed-in instructor's own lessons. It uses the same validation and the same
 * createFault write as the admin workflow, so the maintenance audit log records it.
 *
 * What an instructor cannot do: set makesUnavailable, a workshop or a cost, change the vehicle's status, or touch any other
 * maintenance record. A report only creates a REPORTED fault. The school decides on repair and on whether the vehicle is
 * taken out of service, and a safety-critical fault shows to administrators as a warning only.
 */
export async function reportVehicleFault(instructorUserId: string, vehicleId: string, body: Record<string, unknown>) {
  const today = schoolNow().date;
  const parsed = parseFaultInput(
    { severity: body.severity, description: body.description, reportedOn: today, makesUnavailable: false },
    today,
  );
  if (!parsed.ok) throw new AuthError(400, parsed.message);

  const since = new Date(`${today}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - FAULT_REPORT_LOOKBACK_DAYS);
  const usesVehicle = await prisma.lessonSchedule.findFirst({
    where: {
      instructorUserId,
      vehicleId,
      status: { not: LessonScheduleStatus.CANCELLED },
      lessonDate: { gte: parseDateOnly(since.toISOString().slice(0, 10)) ?? undefined },
    },
    select: { id: true },
  });
  // Reported as not found, so the response does not reveal which vehicles exist.
  if (!usesVehicle) throw new AuthError(404, "Vehicle not found on your lessons.");

  const created = await createFault(vehicleId, instructorUserId, parsed.value);
  return { id: created.id };
}
