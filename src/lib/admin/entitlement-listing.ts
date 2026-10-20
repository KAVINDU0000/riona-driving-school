import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** How many of the latest confirmation rows the page shows for each requirement. */
export const HISTORY_ROWS_SHOWN = 5;

/**
 * Each enrollment requirement of one student, for the admin confirmation page. `used` is the completed plus scheduled
 * lessons for that requirement (cancelled lessons excluded), which is the lower bound for a confirmed count.
 * `updatedAt` is the value the confirmation form must send back, so a stale page is refused. `history` is the latest
 * confirmation rows, read only; the table itself is append-only.
 */
export async function listStudentRequirements(studentUserId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentUserId },
    orderBy: { enrollmentDate: "desc" },
    select: {
      id: true,
      status: true,
      package: { select: { name: true } },
      trainingRequirements: {
        orderBy: [{ vehicleType: "asc" }, { trainingType: "asc" }],
        select: { id: true, vehicleType: true, trainingType: true, requiredSessions: true, updatedAt: true },
      },
    },
  });

  const requirementIds = enrollments.flatMap((e) => e.trainingRequirements.map((r) => r.id));
  const [lessons, changes] = await Promise.all([
    prisma.lessonSchedule.findMany({
      where: { studentUserId, enrollmentId: { in: enrollments.map((e) => e.id) } },
      select: { enrollmentId: true, vehicleType: true, trainingType: true, status: true },
    }),
    prisma.enrollmentRequirementChange.findMany({
      where: { requirementId: { in: requirementIds } },
      // The id breaks ties, so rows written at the same moment always come back in the same order.
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
      select: { requirementId: true, previousRequiredSessions: true, newRequiredSessions: true, reason: true, changedAt: true },
    }),
  ]);

  return enrollments.map((enrollment) => ({
    id: enrollment.id,
    packageName: enrollment.package.name,
    status: enrollment.status,
    requirements: enrollment.trainingRequirements.map((requirement) => ({
      id: requirement.id,
      vehicleType: requirement.vehicleType,
      trainingType: requirement.trainingType,
      requiredSessions: requirement.requiredSessions,
      updatedAt: requirement.updatedAt.toISOString(),
      used: lessons.filter(
        (lesson) =>
          lesson.enrollmentId === enrollment.id &&
          lesson.vehicleType === requirement.vehicleType &&
          lesson.trainingType === requirement.trainingType &&
          lesson.status !== LessonScheduleStatus.CANCELLED,
      ).length,
      history: changes
        .filter((change) => change.requirementId === requirement.id)
        .slice(0, HISTORY_ROWS_SHOWN)
        .map((change) => ({
          previousRequiredSessions: change.previousRequiredSessions,
          newRequiredSessions: change.newRequiredSessions,
          reason: change.reason,
          changedAt: change.changedAt.toISOString(),
        })),
    })),
  }));
}
