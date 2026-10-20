import { AccountStatus, ExamType, MedicalAppointmentStatus, ExamStatus, UserRole, VehicleType } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/**
 * Admin creation of a medical appointment or an exam for one student. Only adding is supported here: changing or
 * cancelling a record is a separate workflow. Times are typed in school time (Asia/Colombo) and must be in the future.
 */

const DESCRIPTION_MAX = 500;
/** Asia/Colombo has no daylight saving time, so this fixed offset is exact. */
const SCHOOL_UTC_OFFSET = "+05:30";
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const STUDENT_ID_PATTERN = /^[A-Za-z0-9-]{1,32}$/;

/** Reads a "YYYY-MM-DDTHH:MM" value from a datetime-local field, as a school-time instant. Refuses anything else. */
export function parseSchoolDateTime(value: unknown, label: string): Date {
  const match = typeof value === "string" ? DATE_TIME_PATTERN.exec(value) : null;
  if (!match) throw new AuthError(400, `${label} must be a date and time.`);
  const instant = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00${SCHOOL_UTC_OFFSET}`);
  // JavaScript rolls an impossible day such as 30 February into March, so the calendar parts are compared after parsing.
  const calendar = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const isReal =
    !Number.isNaN(instant.getTime()) &&
    calendar.getUTCDate() === Number(match[3]) &&
    Number(match[4]) < 24 &&
    Number(match[5]) < 60;
  if (!isReal) throw new AuthError(400, `${label} must be a real date and time.`);
  return instant;
}

function requireFuture(instant: Date, label: string) {
  if (instant.getTime() <= Date.now()) throw new AuthError(400, `${label} must be in the future.`);
}

export function parseMedicalInput(body: Record<string, unknown>) {
  const appointmentDate = parseSchoolDateTime(body.appointmentDate, "The appointment date and time");
  requireFuture(appointmentDate, "The appointment date and time");
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > DESCRIPTION_MAX) {
    throw new AuthError(400, `The note must be ${DESCRIPTION_MAX} characters or fewer.`);
  }
  return { appointmentDate, description: description || null };
}

export function parseExamInput(body: Record<string, unknown>) {
  const examType = Object.values(ExamType).find((value) => value === body.examType);
  if (!examType) throw new AuthError(400, "Choose the exam type.");
  const vehicleValue = body.vehicleType;
  const vehicleType =
    vehicleValue === undefined || vehicleValue === "" || vehicleValue === null
      ? null
      : (Object.values(VehicleType).find((value) => value === vehicleValue) ?? undefined);
  if (vehicleType === undefined) throw new AuthError(400, "Choose a vehicle type from the list, or leave it empty.");
  const scheduledDate = parseSchoolDateTime(body.scheduledDate, "The exam date and time");
  requireFuture(scheduledDate, "The exam date and time");
  return { examType, vehicleType, scheduledDate };
}

/** The student must exist, be a student and be active. Deactivated students cannot be given new appointments. */
async function requireActiveStudent(studentUserIdRaw: string) {
  const studentUserId = studentUserIdRaw.trim();
  if (!STUDENT_ID_PATTERN.test(studentUserId)) throw new AuthError(400, "Invalid student ID.");
  const student = await prisma.user.findFirst({
    where: { userId: studentUserId, role: UserRole.STUDENT, studentProfile: { isNot: null } },
    select: { userId: true, status: true },
  });
  if (!student) throw new AuthError(404, "That student was not found.");
  if (student.status !== AccountStatus.ACTIVE) {
    throw new AuthError(409, "This student's account is deactivated. Reactivate it before adding an appointment.");
  }
  return student.userId;
}

export async function createMedicalAppointment(studentUserId: string, body: Record<string, unknown>) {
  const input = parseMedicalInput(body);
  const userId = await requireActiveStudent(studentUserId);
  const created = await prisma.studentMedical.create({
    data: { studentUserId: userId, appointmentDate: input.appointmentDate, status: MedicalAppointmentStatus.SCHEDULED, description: input.description },
    select: { id: true, appointmentDate: true, status: true },
  });
  return { id: created.id, appointmentDate: created.appointmentDate.toISOString(), status: created.status };
}

export async function createExam(studentUserId: string, body: Record<string, unknown>) {
  const input = parseExamInput(body);
  const userId = await requireActiveStudent(studentUserId);
  const created = await prisma.studentExam.create({
    data: {
      studentUserId: userId,
      examType: input.examType,
      vehicleType: input.vehicleType,
      scheduledDate: input.scheduledDate,
      status: ExamStatus.SCHEDULED,
    },
    select: { id: true, scheduledDate: true, status: true, examType: true },
  });
  return { id: created.id, scheduledDate: created.scheduledDate.toISOString(), status: created.status, examType: created.examType };
}
