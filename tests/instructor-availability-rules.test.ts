import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/http";
import {
  assertNoWindowOverlap,
  assertNotInPast,
  lessonsOutsideWindows,
  overlapsOrTouches,
  parseSessionAssignment,
  parseAvailabilityRange,
} from "@/lib/instructor/availability-rules";

function statusOf(run: () => unknown): number | "ok" {
  try {
    run();
    return "ok";
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

const valid = { date: "2099-06-01", startTime: "08:00" };

describe("parseSessionAssignment", () => {
  it("accepts a date and the start time of a session", () => {
    expect(parseSessionAssignment({ ...valid })).toEqual(valid);
  });

  const badInputs: [Record<string, unknown>, string][] = [
    [{ ...valid, date: "2099-02-30" }, "an impossible date"],
    [{ ...valid, date: "01/06/2099" }, "a wrongly formatted date"],
    [{ ...valid, startTime: "8:00" }, "a wrongly formatted time"],
    [{ date: 5, startTime: 5 }, "non-string values"],
  ];
  for (const [input, why] of badInputs) {
    it(`rejects ${why} with 400`, () => {
      expect(statusOf(() => parseSessionAssignment(input))).toBe(400);
    });
  }
});

describe("assertNotInPast", () => {
  const now = { date: "2099-06-01", minutes: 10 * 60 };
  it("allows a later date and a window still running today", () => {
    expect(statusOf(() => assertNotInPast({ date: "2099-06-02", endTime: "09:00" }, now))).toBe("ok");
    expect(statusOf(() => assertNotInPast({ date: "2099-06-01", endTime: "10:15" }, now))).toBe("ok");
  });
  it("refuses a past date and a window that has ended today", () => {
    expect(statusOf(() => assertNotInPast({ date: "2099-05-31", endTime: "18:00" }, now))).toBe(400);
    expect(statusOf(() => assertNotInPast({ date: "2099-06-01", endTime: "10:00" }, now))).toBe(400);
  });
});

describe("window overlap", () => {
  const morning = { start: 9 * 60, end: 12 * 60 };
  it("treats sessions that share time as overlapping", () => {
    expect(overlapsOrTouches(morning, { start: 11 * 60, end: 13 * 60 })).toBe(true);
    expect(overlapsOrTouches(morning, { start: 8 * 60, end: 13 * 60 })).toBe(true);
  });
  it("allows back-to-back sessions, such as 10:00–12:00 after 08:00–10:00", () => {
    expect(overlapsOrTouches(morning, { start: 12 * 60, end: 14 * 60 })).toBe(false);
  });
  it("allows windows with a break between them", () => {
    expect(overlapsOrTouches(morning, { start: 12 * 60 + 15, end: 14 * 60 })).toBe(false);
    expect(statusOf(() => assertNoWindowOverlap({ start: 13 * 60, end: 17 * 60 }, [morning]))).toBe("ok");
  });
  it("refuses an overlapping window with 409", () => {
    expect(statusOf(() => assertNoWindowOverlap({ start: 11 * 60, end: 13 * 60 }, [morning]))).toBe(409);
  });
});

describe("lessonsOutsideWindows", () => {
  const lessons = [
    { start: 9 * 60, end: 9 * 60 + 30 },
    { start: 11 * 60 + 30, end: 12 * 60 + 30 },
  ];
  it("returns the lessons that no window fully contains", () => {
    expect(lessonsOutsideWindows([{ start: 9 * 60, end: 12 * 60 }], lessons)).toEqual([lessons[1]]);
  });
  it("is empty when every lesson fits, and when there are no lessons", () => {
    expect(lessonsOutsideWindows([{ start: 9 * 60, end: 13 * 60 }], lessons)).toEqual([]);
    expect(lessonsOutsideWindows([], [])).toEqual([]);
  });
  it("does not let a lesson span two separate windows", () => {
    const windows = [
      { start: 9 * 60, end: 10 * 60 },
      { start: 10 * 60 + 15, end: 12 * 60 },
    ];
    expect(lessonsOutsideWindows(windows, [{ start: 9 * 60 + 45, end: 10 * 60 + 30 }])).toHaveLength(1);
  });
});
