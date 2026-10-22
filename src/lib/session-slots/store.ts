import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { LessonScheduleStatus } from "@/generated/prisma/enums";
import { parseTimeOnly, schoolNow, timeToString } from "@/lib/student/time";
import { assertNoSlotOverlap, parseSlotUpdate, toInterval, type SlotUpdate } from "@/lib/session-slots/rules";

/*
 * The fixed session times. Students book a slot, and instructors take a slot. Changing a slot's times, or closing it,
 * is refused while instructors or lessons are already on it from today onward, so nothing booked is left without a slot.
 */

export type SessionSlot = {
  id: string;
  sortOrder: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export type SessionSlotAdminView = SessionSlot & {
  /** Instructor assignments from today onward. */
  futureAssignments: number;
  /** Scheduled or completed lessons from today onward. */
  futureLessons: number;
};

/** Every slot in display order, open or closed. Admins only. */
export async function listSessionSlots(): Promise<SessionSlot[]> {
  const rows = await prisma.sessionSlot.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(toSlot);
}

/** The open slots in display order. Students and instructors only ever see these. */
export async function activeSessionSlots(): Promise<SessionSlot[]> {
  const rows = await prisma.sessionSlot.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return rows.map(toSlot);
}

function toSlot(row: { id: string; sortOrder: number; startTime: Date; endTime: Date; isActive: boolean }): SessionSlot {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    startTime: timeToString(row.startTime),
    endTime: timeToString(row.endTime),
    isActive: row.isActive,
  };
}

/** Admin view of the slots, with how many instructors and lessons are on each one from today onward. */
export async function listSessionSlotsForAdmin(): Promise<SessionSlotAdminView[]> {
  const today = parseDateOnlyToday();
  const slots = await listSessionSlots();
  return Promise.all(
    slots.map(async (slot) => {
      const counts = await futureCountsFor(slot, today);
      return { ...slot, ...counts };
    }),
  );
}

function parseDateOnlyToday(): Date {
  return new Date(`${schoolNow().date}T00:00:00Z`);
}

/** Instructor assignments and lessons that sit on this slot's exact times, from today onward. */
async function futureCountsFor(slot: { startTime: string; endTime: string }, today: Date) {
  const start = parseTimeOnly(slot.startTime)!;
  const end = parseTimeOnly(slot.endTime)!;
  const [futureAssignments, futureLessons] = await Promise.all([
    prisma.instructorAvailability.count({
      where: { availabilityDate: { gte: today }, startTime: start, endTime: end },
    }),
    prisma.lessonSchedule.count({
      where: {
        lessonDate: { gte: today },
        startTime: start,
        endTime: end,
        status: { not: LessonScheduleStatus.CANCELLED },
      },
    }),
  ]);
  return { futureAssignments, futureLessons };
}

/**
 * Changes a slot's times or opens or closes it. Admins only.
 *
 * - The times cannot change while instructors or lessons are on the slot from today onward.
 * - A slot cannot be closed while lessons are booked on it from today onward. Its instructor assignments stay,
 *   but students cannot book a closed slot.
 */
export async function updateSessionSlot(id: string, body: Record<string, unknown>): Promise<SessionSlotAdminView> {
  const input: SlotUpdate = parseSlotUpdate(body);
  const today = parseDateOnlyToday();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.sessionSlot.findUnique({ where: { id } });
    if (!existing) throw new AuthError(404, "Session time not found.");

    const current = toSlot(existing);
    const others = await tx.sessionSlot.findMany({ where: { id: { not: id } }, select: { startTime: true, endTime: true } });
    assertNoSlotOverlap(
      toInterval(input),
      others.map((other) => toInterval({ startTime: timeToString(other.startTime), endTime: timeToString(other.endTime) })),
    );

    const timesChanged = current.startTime !== input.startTime || current.endTime !== input.endTime;
    const counts = await futureCountsFor(current, today);
    if (timesChanged && (counts.futureAssignments > 0 || counts.futureLessons > 0)) {
      throw new AuthError(409, "Instructors or lessons are already on this session time from today onward. Release them before changing the time.");
    }
    if (current.isActive && !input.isActive && counts.futureLessons > 0) {
      throw new AuthError(409, "Lessons are booked in this session from today onward. Cancel them before closing the session.");
    }

    const updated = await tx.sessionSlot.update({
      where: { id },
      data: {
        startTime: parseTimeOnly(input.startTime)!,
        endTime: parseTimeOnly(input.endTime)!,
        isActive: input.isActive,
      },
    });
    return { ...toSlot(updated), ...(await futureCountsFor(toSlot(updated), today)) };
  });
}

/** The open slot that starts at this time, or null. Booking and instructor assignment both use it. */
export async function findActiveSlotByStart(startTime: string): Promise<SessionSlot | null> {
  const start = parseTimeOnly(startTime);
  if (!start) return null;
  const row = await prisma.sessionSlot.findFirst({ where: { startTime: start, isActive: true } });
  return row ? toSlot(row) : null;
}
