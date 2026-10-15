import { describe, expect, it } from "vitest";
import { AttendanceStatus, LessonScheduleStatus, VehicleStatus } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import {
  FEEDBACK_MAX_LENGTH,
  canCancel,
  canComplete,
  canRecordAttendance,
  canWriteFeedback,
  parseAttendance,
  parseDateRange,
  parseFeedback,
  parseStatusFilter,
  shiftDate,
  vehicleWarning,
} from "@/lib/instructor/lesson-rules";

const SCHEDULED = LessonScheduleStatus.SCHEDULED;
const COMPLETED = LessonScheduleStatus.COMPLETED;
const CANCELLED = LessonScheduleStatus.CANCELLED;

function statusCode(fn: () => unknown): number | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

describe("lesson status transitions", () => {
  it("completes only a scheduled lesson whose attendance is recorded", () => {
    expect(canComplete({ status: SCHEDULED, attendance: AttendanceStatus.PRESENT })).toBe(true);
    expect(canComplete({ status: SCHEDULED, attendance: null })).toBe(false);
    expect(canComplete({ status: CANCELLED, attendance: AttendanceStatus.PRESENT })).toBe(false);
    expect(canComplete({ status: COMPLETED, attendance: AttendanceStatus.ABSENT })).toBe(false);
  });

  it("cancels only a scheduled lesson", () => {
    expect(canCancel({ status: SCHEDULED })).toBe(true);
    expect(canCancel({ status: COMPLETED })).toBe(false);
    expect(canCancel({ status: CANCELLED })).toBe(false);
  });

  it("writes feedback only on a completed lesson", () => {
    expect(canWriteFeedback({ status: COMPLETED })).toBe(true);
    expect(canWriteFeedback({ status: SCHEDULED })).toBe(false);
    expect(canWriteFeedback({ status: CANCELLED })).toBe(false);
  });
});

describe("attendance recording", () => {
  const today = "2026-10-15";

  it("allows a started, non-cancelled lesson from today or earlier", () => {
    expect(canRecordAttendance({ status: SCHEDULED, lessonDate: today }, today)).toBe(true);
    expect(canRecordAttendance({ status: COMPLETED, lessonDate: "2026-10-01" }, today)).toBe(true);
  });

  it("refuses future lessons and cancelled lessons", () => {
    expect(canRecordAttendance({ status: SCHEDULED, lessonDate: "2026-10-16" }, today)).toBe(false);
    expect(canRecordAttendance({ status: CANCELLED, lessonDate: today }, today)).toBe(false);
  });

  it("accepts only the defined attendance values", () => {
    expect(parseAttendance("PRESENT")).toBe(AttendanceStatus.PRESENT);
    expect(parseAttendance("ABSENT")).toBe(AttendanceStatus.ABSENT);
    expect(parseAttendance("LATE")).toBe(AttendanceStatus.LATE);
    expect(statusCode(() => parseAttendance("EXCUSED"))).toBe(400);
    expect(statusCode(() => parseAttendance(undefined))).toBe(400);
  });
});

describe("feedback validation", () => {
  it("trims the text and accepts a missing rating", () => {
    expect(parseFeedback({ feedback: "  Good clutch control.  " })).toEqual({ feedback: "Good clutch control.", rating: null });
  });

  it("rejects blank text and text over the limit", () => {
    expect(statusCode(() => parseFeedback({ feedback: "   " }))).toBe(400);
    expect(statusCode(() => parseFeedback({ feedback: "x".repeat(FEEDBACK_MAX_LENGTH + 1) }))).toBe(400);
    expect(parseFeedback({ feedback: "x".repeat(FEEDBACK_MAX_LENGTH) }).feedback.length).toBe(FEEDBACK_MAX_LENGTH);
  });

  it("accepts whole-number ratings from 1 to 5 only", () => {
    expect(parseFeedback({ feedback: "ok", rating: 3 }).rating).toBe(3);
    expect(parseFeedback({ feedback: "ok", rating: "" }).rating).toBeNull();
    expect(statusCode(() => parseFeedback({ feedback: "ok", rating: 0 }))).toBe(400);
    expect(statusCode(() => parseFeedback({ feedback: "ok", rating: 6 }))).toBe(400);
    expect(statusCode(() => parseFeedback({ feedback: "ok", rating: 2.5 }))).toBe(400);
  });
});

describe("date range and navigation", () => {
  it("accepts an ordered range within the limit", () => {
    expect(parseDateRange("2026-10-12", "2026-10-18")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("rejects reversed, malformed and oversized ranges", () => {
    expect(statusCode(() => parseDateRange("2026-10-18", "2026-10-12"))).toBe(400);
    expect(statusCode(() => parseDateRange("18/10/2026", "2026-10-18"))).toBe(400);
    expect(statusCode(() => parseDateRange("2026-01-01", "2026-03-05"))).toBe(400);
  });

  it("shifts dates across month and year boundaries", () => {
    expect(shiftDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDate("2026-10-15", 7)).toBe("2026-10-22");
  });
});

describe("status filter", () => {
  it("defaults to all statuses and accepts the schema statuses", () => {
    expect(parseStatusFilter(null)).toBe("ALL");
    expect(parseStatusFilter(undefined)).toBe("ALL");
    expect(parseStatusFilter("SCHEDULED")).toBe("SCHEDULED");
    expect(parseStatusFilter("COMPLETED")).toBe("COMPLETED");
    expect(parseStatusFilter("CANCELLED")).toBe("CANCELLED");
  });

  it("rejects anything that is not a schema status", () => {
    expect(statusCode(() => parseStatusFilter("DELETED"))).toBe(400);
    expect(statusCode(() => parseStatusFilter("scheduled"))).toBe(400);
  });
});

describe("vehicle status warnings", () => {
  it("gives no warning for an active vehicle", () => {
    expect(vehicleWarning(VehicleStatus.ACTIVE)).toBeNull();
  });

  it("warns for maintenance and for inactive vehicles", () => {
    expect(vehicleWarning(VehicleStatus.MAINTENANCE)).toContain("maintenance");
    expect(vehicleWarning(VehicleStatus.INACTIVE)).toContain("inactive");
  });
});
