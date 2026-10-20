import { ExamStatus, MedicalAppointmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ADMIN_PAGE_SIZE, pageCount } from "@/lib/admin/query";

/*
 * Read-only lists of upcoming medical appointments and exams, for the admin dashboard cards. The conditions are the
 * same as the dashboard counts in lib/admin/dashboard.ts: status SCHEDULED, and a date from now on.
 * Appointment notes and exam results are not selected: they are not part of the admin lists.
 */

export async function listUpcomingMedical(page: number, now: Date = new Date()) {
  const where = { status: MedicalAppointmentStatus.SCHEDULED, appointmentDate: { gte: now } };
  const [total, rows] = await prisma.$transaction([
    prisma.studentMedical.count({ where }),
    prisma.studentMedical.findMany({
      where,
      orderBy: [{ appointmentDate: "asc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        student: { select: { userId: true, fullName: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: pageCount(total),
    items: rows.map((row) => ({
      id: row.id,
      studentId: row.student.userId,
      studentName: row.student.fullName,
      appointmentDate: row.appointmentDate.toISOString(),
      status: row.status,
    })),
  };
}

export async function listUpcomingExams(page: number, now: Date = new Date()) {
  const where = { status: ExamStatus.SCHEDULED, scheduledDate: { gte: now } };
  const [total, rows] = await prisma.$transaction([
    prisma.studentExam.count({ where }),
    prisma.studentExam.findMany({
      where,
      orderBy: [{ scheduledDate: "asc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        examType: true,
        vehicleType: true,
        scheduledDate: true,
        status: true,
        student: { select: { userId: true, fullName: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: pageCount(total),
    items: rows.map((row) => ({
      id: row.id,
      studentId: row.student.userId,
      studentName: row.student.fullName,
      examType: row.examType,
      vehicleType: row.vehicleType,
      scheduledDate: row.scheduledDate.toISOString(),
      status: row.status,
    })),
  };
}
