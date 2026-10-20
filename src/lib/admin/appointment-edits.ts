import { AppointmentType, ExamStatus, ExamType, MedicalAppointmentStatus, VehicleType } from "@/generated/prisma/enums";
import { parseSchoolDateTime } from "@/lib/admin/appointments";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/*
 * Admin changes to a scheduled medical appointment or exam: its date and time, its details, and whether it was
 * completed or cancelled. Only SCHEDULED records can change. Every date change is kept in AppointmentDateHistory with
 * the previous date, the new date, the optional reason and the admin who made the change.
 */

const NOTE_MAX = 500;
const REASON_MAX = 300;
const STUDENT_ID_PATTERN = /^[A-Za-z0-9-]{1,32}$/;
const ID_PATTERN = /^[a-z0-9]{1,64}$/i;

/** Statuses an admin may set on a scheduled record. Going back to SCHEDULED is not offered. */
const MEDICAL_OUTCOMES = [MedicalAppointmentStatus.COMPLETED, MedicalAppointmentStatus.CANCELLED] as const;
const EXAM_OUTCOMES = [ExamStatus.COMPLETED, ExamStatus.CANCELLED] as const;

function checkIds(studentUserIdRaw: string, recordId: string) {
  const studentUserId = studentUserIdRaw.trim();
  if (!STUDENT_ID_PATTERN.test(studentUserId) || !ID_PATTERN.test(recordId)) throw new AuthError(400, "Invalid record.");
  return studentUserId;
}

function optionalReason(body: Record<string, unknown>): string | null {
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length > REASON_MAX) throw new AuthError(400, `The reason must be ${REASON_MAX} characters or fewer.`);
  return reason || null;
}

/** A new date must be in the future. The check runs only when the date actually changes. */
function requireFutureIfChanged(next: Date, previous: Date, label: string) {
  if (next.getTime() === previous.getTime()) return;
  if (next.getTime() <= Date.now()) throw new AuthError(400, `${label} must be in the future.`);
}

export type MedicalUpdate = {
  appointmentDate?: string;
  description?: string;
  status?: string;
  reason?: string;
};

export async function updateMedicalAppointment(
  studentUserIdRaw: string,
  appointmentId: string,
  adminUserId: string,
  body: Record<string, unknown>,
) {
  const studentUserId = checkIds(studentUserIdRaw, appointmentId);
  const reason = optionalReason(body);
  const newDate = typeof body.appointmentDate === "string" && body.appointmentDate !== "" ? parseSchoolDateTime(body.appointmentDate, "The appointment date and time") : null;

  let newDescription: string | null | undefined;
  if (body.description !== undefined) {
    const text = typeof body.description === "string" ? body.description.trim() : "";
    if (text.length > NOTE_MAX) throw new AuthError(400, `The note must be ${NOTE_MAX} characters or fewer.`);
    newDescription = text || null;
  }

  let newStatus: (typeof MEDICAL_OUTCOMES)[number] | undefined;
  if (body.status !== undefined && body.status !== "") {
    const found = MEDICAL_OUTCOMES.find((value) => value === body.status);
    if (!found) throw new AuthError(400, "Choose Completed or Cancelled.");
    newStatus = found;
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StudentMedical" WHERE id = ${appointmentId} FOR UPDATE`;
    const current = await tx.studentMedical.findFirst({
      where: { id: appointmentId, studentUserId },
      select: { id: true, appointmentDate: true, status: true, description: true },
    });
    if (!current) throw new AuthError(404, "That appointment was not found for this student.");
    if (current.status !== MedicalAppointmentStatus.SCHEDULED) {
      throw new AuthError(409, "This appointment is no longer scheduled, so it cannot be changed.");
    }

    const data: { appointmentDate?: Date; description?: string | null; status?: MedicalAppointmentStatus } = {};
    if (newDate) {
      requireFutureIfChanged(newDate, current.appointmentDate, "The appointment date and time");
      if (newDate.getTime() !== current.appointmentDate.getTime()) {
        data.appointmentDate = newDate;
        await tx.appointmentDateHistory.create({
          data: {
            appointmentType: AppointmentType.MEDICAL,
            studentMedicalId: current.id,
            previousDate: current.appointmentDate,
            newDate,
            reason,
            changedByUserId: adminUserId,
          },
        });
      }
    }
    if (newDescription !== undefined && newDescription !== current.description) data.description = newDescription;
    if (newStatus) data.status = newStatus;

    if (Object.keys(data).length > 0) {
      await tx.studentMedical.update({ where: { id: current.id }, data });
    }
    return { id: current.id, changed: Object.keys(data).length > 0 };
  });
}

export type ExamUpdate = {
  examType?: string;
  vehicleType?: string | null;
  scheduledDate?: string;
  status?: string;
  reason?: string;
};

export async function updateExam(studentUserIdRaw: string, examId: string, adminUserId: string, body: Record<string, unknown>) {
  const studentUserId = checkIds(studentUserIdRaw, examId);
  const reason = optionalReason(body);
  const newDate = typeof body.scheduledDate === "string" && body.scheduledDate !== "" ? parseSchoolDateTime(body.scheduledDate, "The exam date and time") : null;

  let newType: ExamType | undefined;
  if (body.examType !== undefined && body.examType !== "") {
    newType = Object.values(ExamType).find((value) => value === body.examType);
    if (!newType) throw new AuthError(400, "Choose the exam type.");
  }

  let newVehicle: VehicleType | null | undefined;
  if (body.vehicleType !== undefined) {
    if (body.vehicleType === null || body.vehicleType === "") {
      newVehicle = null;
    } else {
      newVehicle = Object.values(VehicleType).find((value) => value === body.vehicleType);
      if (!newVehicle) throw new AuthError(400, "Choose a vehicle type from the list, or leave it empty.");
    }
  }

  let newStatus: (typeof EXAM_OUTCOMES)[number] | undefined;
  if (body.status !== undefined && body.status !== "") {
    const found = EXAM_OUTCOMES.find((value) => value === body.status);
    if (!found) throw new AuthError(400, "Choose Completed or Cancelled.");
    newStatus = found;
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StudentExam" WHERE id = ${examId} FOR UPDATE`;
    const current = await tx.studentExam.findFirst({
      where: { id: examId, studentUserId },
      select: { id: true, scheduledDate: true, status: true, examType: true, vehicleType: true },
    });
    if (!current) throw new AuthError(404, "That exam was not found for this student.");
    if (current.status !== ExamStatus.SCHEDULED) {
      throw new AuthError(409, "This exam is no longer scheduled, so it cannot be changed.");
    }

    const data: {
      examType?: ExamType;
      vehicleType?: VehicleType | null;
      scheduledDate?: Date;
      status?: ExamStatus;
    } = {};
    if (newDate) {
      requireFutureIfChanged(newDate, current.scheduledDate, "The exam date and time");
      if (newDate.getTime() !== current.scheduledDate.getTime()) {
        data.scheduledDate = newDate;
        await tx.appointmentDateHistory.create({
          data: {
            appointmentType: AppointmentType.EXAM,
            studentExamId: current.id,
            previousDate: current.scheduledDate,
            newDate,
            reason,
            changedByUserId: adminUserId,
          },
        });
      }
    }
    if (newType && newType !== current.examType) data.examType = newType;
    if (newVehicle !== undefined && newVehicle !== current.vehicleType) data.vehicleType = newVehicle;
    if (newStatus) data.status = newStatus;

    if (Object.keys(data).length > 0) {
      await tx.studentExam.update({ where: { id: current.id }, data });
    }
    return { id: current.id, changed: Object.keys(data).length > 0 };
  });
}
