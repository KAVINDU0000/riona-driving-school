import { LessonScheduleStatus, UserRole } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { dateToString } from "@/lib/student/time";

/**
 * The signed-in instructor's own account and profile fields. Password hashes and session data are never selected.
 * Callers pass the userId from the verified session.
 */
export async function getInstructorAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { userId: true, email: true, role: true },
  });
  const profile = await prisma.instructorProfile.findUnique({
    where: { userId },
    select: { fullName: true, phoneNumber: true, hireDate: true, status: true },
  });
  if (!user || !profile || user.role !== UserRole.INSTRUCTOR) {
    throw new AuthError(404, "Account not found.");
  }

  // The vehicle types of the lessons this instructor teaches. A vehicle has one type, so this is read from lessons.
  const teaching = await prisma.lessonSchedule.findMany({
    where: { instructorUserId: userId, status: { not: LessonScheduleStatus.CANCELLED } },
    distinct: ["vehicleType"],
    orderBy: { vehicleType: "asc" },
    select: { vehicleType: true },
  });

  return {
    instructorId: user.userId,
    email: user.email ?? "",
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber,
    hireDate: dateToString(profile.hireDate),
    status: profile.status,
    vehicleTypes: teaching.map((row) => row.vehicleType),
  };
}

/**
 * Updates the signed-in instructor's mobile number. The row is selected by the session's userId, so an instructor
 * can only change their own number. No other profile field is writable here.
 */
export async function updateInstructorMobile(userId: string, phoneNumber: string) {
  const result = await prisma.instructorProfile.updateMany({
    where: { userId },
    data: { phoneNumber },
  });
  if (result.count !== 1) {
    throw new AuthError(404, "Account not found.");
  }
  return { phoneNumber };
}
