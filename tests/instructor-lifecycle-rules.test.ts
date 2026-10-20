import { describe, expect, it } from "vitest";
import { AttendanceStatus, LessonScheduleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import {
  buildHistory,
  canCancel,
  canComplete,
  canEditNotes,
  canRecordAttendance,
  canWriteFeedback,
  LESSON_NOTES_MAX_LENGTH,
  parseLessonNotes,
} from "@/lib/instructor/lesson-rules";

const { SCHEDULED, COMPLETED, CANCELLED } = LessonScheduleStatus;

describe("lesson state transitions", () => {
  it("allows completing only a scheduled lesson with attendance, so a lesson cannot be completed twice", () => {
    expect(canComplete({ status: SCHEDULED, attendance: AttendanceStatus.PRESENT })).toBe(true);
    expect(canComplete({ status: SCHEDULED, attendance: null })).toBe(false);
    expect(canComplete({ status: COMPLETED, attendance: AttendanceStatus.PRESENT })).toBe(false);
    expect(canComplete({ status: CANCELLED, attendance: AttendanceStatus.PRESENT })).toBe(false);
  });

  it("allows cancelling only a scheduled lesson", () => {
    expect(canCancel({ status: SCHEDULED })).toBe(true);
    expect(canCancel({ status: COMPLETED })).toBe(false);
    expect(canCancel({ status: CANCELLED })).toBe(false);
  });

  it("records attendance only on a started, uncancelled lesson", () => {
    expect(canRecordAttendance({ status: SCHEDULED, lessonDate: "2099-06-01" }, "2099-06-01")).toBe(true);
    expect(canRecordAttendance({ status: SCHEDULED, lessonDate: "2099-06-02" }, "2099-06-01")).toBe(false);
    expect(canRecordAttendance({ status: CANCELLED, lessonDate: "2099-05-01" }, "2099-06-01")).toBe(false);
  });

  it("allows feedback only after completion and notes until cancellation", () => {
    expect(canWriteFeedback({ status: COMPLETED })).toBe(true);
    expect(canWriteFeedback({ status: SCHEDULED })).toBe(false);
    expect(canEditNotes({ status: SCHEDULED })).toBe(true);
    expect(canEditNotes({ status: COMPLETED })).toBe(true);
    expect(canEditNotes({ status: CANCELLED })).toBe(false);
  });
});

describe("parseLessonNotes", () => {
  it("trims, and treats empty text as clearing the note", () => {
    expect(parseLessonNotes("  parked well  ")).toBe("parked well");
    expect(parseLessonNotes("   ")).toBeNull();
    expect(parseLessonNotes(undefined)).toBeNull();
    expect(parseLessonNotes(null)).toBeNull();
  });
  it("refuses non-text and over-long notes with 400", () => {
    for (const bad of [5, {}, "x".repeat(LESSON_NOTES_MAX_LENGTH + 1)]) {
      try {
        parseLessonNotes(bad);
        throw new Error("expected a rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).status).toBe(400);
      }
    }
    expect(parseLessonNotes("x".repeat(LESSON_NOTES_MAX_LENGTH))).toHaveLength(LESSON_NOTES_MAX_LENGTH);
  });
});

describe("buildHistory", () => {
  const base = {
    status: SCHEDULED,
    attendance: null,
    createdAt: new Date("2099-05-01T04:00:00Z"),
    attendanceMarkedAt: null,
    attendanceMarkedByRole: null,
    cancelledAt: null,
    cancelledByRole: null,
    cancellationReason: null,
    feedbackAt: null,
  } as const;

  it("starts with the booking", () => {
    expect(buildHistory(base).map((event) => event.kind)).toEqual(["BOOKED"]);
  });

  it("lists attendance, completion and feedback in order, and does not invent a completion time", () => {
    const events = buildHistory({
      ...base,
      status: COMPLETED,
      attendance: AttendanceStatus.LATE,
      attendanceMarkedAt: new Date("2099-06-01T05:00:00Z"),
      attendanceMarkedByRole: "INSTRUCTOR",
      feedbackAt: new Date("2099-06-01T06:00:00Z"),
    });
    expect(events.map((event) => event.kind)).toEqual(["BOOKED", "ATTENDANCE", "COMPLETED", "FEEDBACK"]);
    expect(events[1].text).toBe("Attendance recorded as Late by an instructor.");
    expect(events[2].at).toBeNull();
  });

  it("shows who cancelled and why, by role only", () => {
    const events = buildHistory({
      ...base,
      status: CANCELLED,
      cancelledAt: new Date("2099-05-20T03:00:00Z"),
      cancelledByRole: "ADMIN",
      cancellationReason: "Vehicle unavailable",
    });
    expect(events.at(-1)?.kind).toBe("CANCELLED");
    expect(events.at(-1)?.text).toBe("Lesson cancelled by the school. Reason: Vehicle unavailable");
  });
});
