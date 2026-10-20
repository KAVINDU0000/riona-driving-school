import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/http";
import {
  assertNoWindowOverlap,
  assertNotInPast,
  lessonsOutsideWindows,
  overlapsOrTouches,
  parseAvailabilityInput,
  parseAvailabilityRange,
} from "@/lib/instructor/availability-rules";
import { breaksBetween } from "@/lib/instructor/availability-view";

function statusOf(run: () => unknown): number | "ok" {
  try {
    run();
    return "ok";
  } catch (error) {
    return error instanceof AuthError ? error.status : -1;
  }
}

const valid = { date: "2099-06-01", startTime: "09:00", endTime: "12:00" };

describe("parseAvailabilityInput", () => {
  it("accepts a window on the 15-minute grid and trims the note", () => {
    expect(parseAvailabilityInput({ ...valid, notes: "  Morning only  " })).toEqual({ ...valid, notes: "Morning only" });
    expect(parseAvailabilityInput({ ...valid }).notes).toBeNull();
    expect(parseAvailabilityInput({ ...valid, notes: "   " }).notes).toBeNull();
  });

  const badInputs: [Record<string, unknown>, string][] = [
    [{ ...valid, date: "2099-02-30" }, "an impossible date"],
    [{ ...valid, date: "01/06/2099" }, "a wrongly formatted date"],
    [{ ...valid, startTime: "9:00" }, "a wrongly formatted time"],
    [{ ...valid, startTime: "09:10" }, "a time off the grid"],
    [{ ...valid, endTime: "09:00" }, "an end equal to the start"],
    [{ ...valid, startTime: "12:00", endTime: "09:00" }, "a reversed window"],
    [{ ...valid, startTime: "09:00", endTime: "09:15" }, "a window shorter than 30 minutes"],
    [{ ...valid, notes: 5 }, "a non-text note"],
    [{ ...valid, notes: "x".repeat(201) }, "a note over 200 characters"],
    [{ date: 5, startTime: 5, endTime: 5 }, "non-string values"],
  ];
  for (const [input, why] of badInputs) {
    it(`rejects ${why} with 400`, () => {
      expect(statusOf(() => parseAvailabilityInput(input))).toBe(400);
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
  it("treats touching windows as overlapping, because they are one window", () => {
    expect(overlapsOrTouches(morning, { start: 12 * 60, end: 14 * 60 })).toBe(true);
    expect(overlapsOrTouches(morning, { start: 11 * 60, end: 13 * 60 })).toBe(true);
    expect(overlapsOrTouches(morning, { start: 8 * 60, end: 13 * 60 })).toBe(true);
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

describe("breaksBetween", () => {
  it("lists the gaps between windows in time order", () => {
    expect(
      breaksBetween([
        { startTime: "14:00", endTime: "17:00" },
        { startTime: "09:00", endTime: "12:00" },
      ]),
    ).toEqual([{ startTime: "12:00", endTime: "14:00" }]);
  });
  it("is empty for one window or none", () => {
    expect(breaksBetween([{ startTime: "09:00", endTime: "12:00" }])).toEqual([]);
    expect(breaksBetween([])).toEqual([]);
  });
});

describe("parseAvailabilityRange", () => {
  it("accepts a range up to 62 days and refuses bad ones", () => {
    expect(parseAvailabilityRange("2099-06-01", "2099-06-07")).toEqual({ from: "2099-06-01", to: "2099-06-07" });
    expect(statusOf(() => parseAvailabilityRange("2099-06-07", "2099-06-01"))).toBe(400);
    expect(statusOf(() => parseAvailabilityRange("2099-06-01", "2099-09-01"))).toBe(400);
    expect(statusOf(() => parseAvailabilityRange("nope", "2099-06-01"))).toBe(400);
  });
});
